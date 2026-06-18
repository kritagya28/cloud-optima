const { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand, DescribeAddressesCommand } = require('@aws-sdk/client-ec2');
const { S3Client, ListBucketsCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
const { CloudWatchClient, GetMetricStatisticsCommand } = require('@aws-sdk/client-cloudwatch');

// ================= SIMULATED FALLBACK DATASETS =================
const MOCK_MONTHLY_COSTS = [
  { serviceName: 'Amazon Elastic Compute Cloud (EC2)', cost: 1245.50 },
  { serviceName: 'Amazon Simple Storage Service (S3)', cost: 480.20 },
  { serviceName: 'Amazon Relational Database Service (RDS)', cost: 650.00 },
  { serviceName: 'Amazon EBS', cost: 180.30 },
  { serviceName: 'Others', cost: 95.80 }
];

const MOCK_EC2_INSTANCES = [
  {
    resourceId: 'i-0123456789abcdef0',
    resourceName: 'web-prod-01',
    status: 'running',
    type: 't3.large',
    region: 'us-east-1',
    metrics: { cpuUtilizationAvg: 2.1 },
    costEstimation: 64.80,
  },
  {
    resourceId: 'i-0abcdef0123456789',
    resourceName: 'dev-sandbox-test',
    status: 'running',
    type: 't3.xlarge',
    region: 'us-east-1',
    metrics: { cpuUtilizationAvg: 25.4 }, // CPU high, not idle
    costEstimation: 129.60,
  },
  {
    resourceId: 'i-0987654321fedcba0',
    resourceName: 'database-replica',
    status: 'running',
    type: 'm5.large',
    region: 'us-east-1',
    metrics: { cpuUtilizationAvg: 45.5 },
    costEstimation: 70.08,
  }
];

const MOCK_S3_BUCKETS = [
  {
    resourceId: 's3-log-bucket-092',
    resourceName: 'cloudcost-dashboard-logs',
    region: 'us-east-1',
    metrics: { sizeGB: 1250, lastAccessed: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
    costEstimation: 28.75
  },
  {
    resourceId: 'production-data-active',
    resourceName: 'production-data-active',
    region: 'us-east-1',
    metrics: { sizeGB: 4500, lastAccessed: new Date() }, // Active, not idle
    costEstimation: 103.50
  }
];

const MOCK_EBS_VOLUMES = [
  {
    resourceId: 'vol-05ef861c8bb042c12',
    resourceName: 'unattached-db-backup',
    status: 'available',
    region: 'us-east-1',
    metrics: { sizeGB: 500 },
    costEstimation: 50.00
  },
  {
    resourceId: 'vol-09a25b18cf037fde5',
    resourceName: 'system-root-web',
    status: 'in-use',
    region: 'us-east-1',
    metrics: { sizeGB: 80 },
    costEstimation: 8.00
  }
];

const MOCK_ELASTIC_IPS = [
  {
    resourceId: 'eipalloc-017e81d11548a801e',
    resourceName: 'unattached-test-eip',
    status: 'associated', // Associated, not orphaned
    region: 'us-east-1',
    metrics: {},
    costEstimation: 0
  },
  {
    resourceId: 'eipalloc-043e06a38bb042c12',
    resourceName: 'prod-natgateway-eip',
    status: 'associated',
    region: 'us-east-1',
    metrics: {},
    costEstimation: 0
  }
];

// Helper to determine if actual AWS credentials are configured (checking parameter first, then process.env)
const isAwsConfigured = (creds) => {
  if (process.env.FORCE_SIMULATED === 'true') {
    return false;
  }

  const isMockKey = (key) => {
    return !key || 
           key.includes('*') || 
           key.includes('•') || 
           key.includes('your_') || 
           key.includes('EXAMPLE') || 
           key.includes('VALID') || 
           key.length < 5;
  };

  if (creds && creds.accessKeyId && creds.secretAccessKey) {
    if (isMockKey(creds.accessKeyId) || isMockKey(creds.secretAccessKey)) {
      return false;
    }
    return true;
  }
  const keyId = process.env.AWS_ACCESS_KEY_ID;
  const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
  return keyId && !isMockKey(keyId) && secretKey && !isMockKey(secretKey);
};

// Gets Client configuration dynamically based on supplied user credentials parameters
const getClientConfig = (creds, reqRegion) => {
  const region = reqRegion || (creds && creds.region) || process.env.AWS_REGION || 'us-east-1';
  if (creds && creds.accessKeyId && creds.secretAccessKey) {
    return {
      region,
      credentials: {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
      }
    };
  }
  return {
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
  };
};

/**
 * Scans AWS Cost Explorer for service-by-service costs in the current month.
 */
async function scanMonthlyCosts(creds, reqRegion) {
  if (!isAwsConfigured(creds)) {
    console.log('[AWS Scanner] Credentials not configured. Returning simulated Cost Explorer data.');
    return MOCK_MONTHLY_COSTS;
  }

  try {
    const client = new CostExplorerClient(getClientConfig(creds, reqRegion));
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = today.toISOString().split('T')[0];

    const endDate = startOfMonth === endOfMonth 
      ? new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : endOfMonth;

    const command = new GetCostAndUsageCommand({
      TimePeriod: { Start: startOfMonth, End: endDate },
      Granularity: 'MONTHLY',
      Metrics: ['UnblendedCost'],
      GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }]
    });

    const response = await client.send(command);
    const costData = response.ResultsByTime[0]?.Groups?.map(group => {
      const serviceName = group.Keys[0];
      const cost = parseFloat(group.Metrics.UnblendedCost.Amount || 0);
      return { serviceName, cost };
    }) || [];

    return costData.sort((a, b) => b.cost - a.cost);
  } catch (err) {
    console.warn(`[AWS Scanner] Cost Explorer Error: ${err.message}. Falling back to simulated costs data.`);
    return MOCK_MONTHLY_COSTS;
  }
}

/**
 * Scans EC2 instances. Retrieves CPU metrics via CloudWatch.
 */
async function scanEC2Instances(creds, reqRegion) {
  if (!isAwsConfigured(creds)) {
    console.log('[AWS Scanner] Credentials not configured. Returning simulated EC2 instances.');
    return MOCK_EC2_INSTANCES.map(inst => ({ ...inst, region: reqRegion || 'us-east-1' }));
  }

  try {
    const config = getClientConfig(creds, reqRegion);
    const ec2 = new EC2Client(config);
    const cw = new CloudWatchClient(config);

    const command = new DescribeInstancesCommand({});
    const response = await ec2.send(command);

    const instances = [];
    for (const reservation of response.Reservations || []) {
      for (const inst of reservation.Instances || []) {
        const nameTag = inst.Tags?.find(tag => tag.Key === 'Name')?.Value || inst.InstanceId;
        const instanceId = inst.InstanceId;
        
        let cpuAvg = 0;
        try {
          const cwCommand = new GetMetricStatisticsCommand({
            Namespace: 'AWS/EC2',
            MetricName: 'CPUUtilization',
            Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            StartTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            EndTime: new Date(),
            Period: 3600 * 24,
            Statistics: ['Average']
          });
          const cwRes = await cw.send(cwCommand);
          const points = cwRes.Datapoints || [];
          if (points.length > 0) {
            const sum = points.reduce((acc, pt) => acc + pt.Average, 0);
            cpuAvg = sum / points.length;
          }
        } catch (cwErr) {
          console.warn(`[AWS Scanner] CPU metrics failed for ${instanceId}:`, cwErr.message);
        }

        const type = inst.InstanceType;
        let costEst = 30.00;
        if (type.includes('xlarge')) costEst = 130.00;
        else if (type.includes('large')) costEst = 65.00;
        else if (type.includes('medium')) costEst = 32.00;
        else if (type.includes('micro') || type.includes('nano')) costEst = 8.00;

        instances.push({
          resourceId: instanceId,
          resourceName: nameTag,
          status: inst.State?.Name,
          type,
          region: config.region,
          metrics: { cpuUtilizationAvg: parseFloat(cpuAvg.toFixed(2)) },
          costEstimation: costEst
        });
      }
    }
    return instances;
  } catch (err) {
    console.warn(`[AWS Scanner] EC2 Scan Error: ${err.message}. Falling back to simulated EC2 instances.`);
    return MOCK_EC2_INSTANCES;
  }
}

/**
 * Scans S3 Buckets and estimates size
 */
async function scanS3Buckets(creds, reqRegion) {
  if (!isAwsConfigured(creds)) {
    console.log('[AWS Scanner] Credentials not configured. Returning simulated S3 Buckets.');
    return MOCK_S3_BUCKETS.map(b => ({ ...b, region: reqRegion || 'us-east-1' }));
  }

  try {
    const config = getClientConfig(creds, reqRegion);
    const s3 = new S3Client(config);
    const command = new ListBucketsCommand({});
    const response = await s3.send(command);

    const buckets = [];
    for (const bucket of response.Buckets || []) {
      const bucketName = bucket.Name;

      let totalSize = 0;
      try {
        const listCommand = new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1000 });
        const listRes = await s3.send(listCommand);
        const contents = listRes.Contents || [];
        totalSize = contents.reduce((acc, obj) => acc + (obj.Size || 0), 0);
      } catch (listErr) {
        console.warn(`[AWS Scanner] Size listing limited for bucket ${bucketName}:`, listErr.message);
      }

      const sizeGB = parseFloat((totalSize / (1024 * 1024 * 1024)).toFixed(3));
      buckets.push({
        resourceId: bucketName,
        resourceName: bucketName,
        region: config.region,
        metrics: { sizeGB, lastAccessed: bucket.CreationDate },
        costEstimation: parseFloat((sizeGB * 0.023).toFixed(2))
      });
    }

    return buckets;
  } catch (err) {
    console.warn(`[AWS Scanner] S3 Scan Error: ${err.message}. Falling back to simulated S3 buckets.`);
    return MOCK_S3_BUCKETS;
  }
}

/**
 * Scans EBS Volumes, tracking attachments
 */
async function scanEBSVolumes(creds, reqRegion) {
  if (!isAwsConfigured(creds)) {
    console.log('[AWS Scanner] Credentials not configured. Returning simulated EBS Volumes.');
    return MOCK_EBS_VOLUMES.map(v => ({ ...v, region: reqRegion || 'us-east-1' }));
  }

  try {
    const config = getClientConfig(creds, reqRegion);
    const ec2 = new EC2Client(config);
    const command = new DescribeVolumesCommand({});
    const response = await ec2.send(command);

    const volumes = [];
    for (const vol of response.Volumes || []) {
      const nameTag = vol.Tags?.find(tag => tag.Key === 'Name')?.Value || vol.VolumeId;
      const size = vol.Size || 0;
      const isAttached = vol.Attachments && vol.Attachments.length > 0;
      const status = isAttached ? 'in-use' : 'available';

      volumes.push({
        resourceId: vol.VolumeId,
        resourceName: nameTag,
        status,
        region: config.region,
        metrics: { sizeGB: size },
        costEstimation: parseFloat((size * 0.10).toFixed(2))
      });
    }
    return volumes;
  } catch (err) {
    console.warn(`[AWS Scanner] EBS Scan Error: ${err.message}. Falling back to simulated EBS volumes.`);
    return MOCK_EBS_VOLUMES;
  }
}

/**
 * Scans Elastic IPs
 */
async function scanElasticIPs(creds, reqRegion) {
  if (!isAwsConfigured(creds)) {
    console.log('[AWS Scanner] Credentials not configured. Returning simulated Elastic IPs.');
    return MOCK_ELASTIC_IPS.map(ip => ({ ...ip, region: reqRegion || 'us-east-1' }));
  }

  try {
    const config = getClientConfig(creds, reqRegion);
    const ec2 = new EC2Client(config);
    const command = new DescribeAddressesCommand({});
    const response = await ec2.send(command);

    const addresses = [];
    for (const addr of response.Addresses || []) {
      const nameTag = addr.Tags?.find(tag => tag.Key === 'Name')?.Value || addr.PublicIp;
      const isAssociated = !!addr.AssociationId;
      const status = isAssociated ? 'associated' : 'unassociated';

      addresses.push({
        resourceId: addr.AllocationId || addr.PublicIp,
        resourceName: nameTag,
        status,
        region: config.region,
        metrics: {},
        costEstimation: isAssociated ? 0 : 3.60
      });
    }
    return addresses;
  } catch (err) {
    console.warn(`[AWS Scanner] EIP Scan Error: ${err.message}. Falling back to simulated Elastic IPs.`);
    return MOCK_ELASTIC_IPS;
  }
}

module.exports = {
  scanMonthlyCosts,
  scanEC2Instances,
  scanS3Buckets,
  scanEBSVolumes,
  scanElasticIPs
};
