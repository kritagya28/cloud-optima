/**
 * Optimization Engine
 * Evaluates raw scanned resources using heuristics to identify waste.
 */

/**
 * Process raw scanned data and return optimized snapshots.
 * @param {Array} ec2Instances - EC2 scan results
 * @param {Array} ebsVolumes - EBS scan results
 * @param {Array} elasticIPs - Elastic IP scan results
 * @param {Array} s3Buckets - S3 scan results
 */
function analyzeResources({ ec2Instances, ebsVolumes, elasticIPs, s3Buckets }) {
  const recommendations = [];
  let totalCurrentCost = 0;
  let totalPotentialSavings = 0;

  // 1. Evaluate EC2 instances
  ec2Instances.forEach(instance => {
    totalCurrentCost += instance.costEstimation;
    
    // Heuristic: CPU Avg < 5.0% over active periods indicates idle/underutilized instance
    if (instance.status === 'running' && instance.metrics.cpuUtilizationAvg < 5.0) {
      const savings = instance.costEstimation;
      totalPotentialSavings += savings;

      recommendations.push({
        resourceId: instance.resourceId,
        resourceName: instance.resourceName,
        resourceType: 'EC2',
        region: instance.region,
        status: instance.status,
        metrics: {
          cpuUtilizationAvg: instance.metrics.cpuUtilizationAvg
        },
        costEstimation: instance.costEstimation,
        potentialSavings: savings,
        optimizationStatus: 'idle',
        recommendation: `Stop or downsize idle EC2 instance '${instance.resourceName}' (Avg CPU: ${instance.metrics.cpuUtilizationAvg}%)`
      });
    }
  });

  // 2. Evaluate EBS Volumes
  ebsVolumes.forEach(vol => {
    totalCurrentCost += vol.costEstimation;

    // Heuristic: Volume status is 'available' (unattached) represents orphaned storage waste
    if (vol.status === 'available') {
      const savings = vol.costEstimation;
      totalPotentialSavings += savings;

      recommendations.push({
        resourceId: vol.resourceId,
        resourceName: vol.resourceName,
        resourceType: 'EBS',
        region: vol.region,
        status: vol.status,
        metrics: {
          sizeGB: vol.metrics.sizeGB
        },
        costEstimation: vol.costEstimation,
        potentialSavings: savings,
        optimizationStatus: 'orphaned',
        recommendation: `Delete unattached EBS volume '${vol.resourceName}' (${vol.metrics.sizeGB} GB)`
      });
    }
  });

  // 3. Evaluate Elastic IP Addresses
  elasticIPs.forEach(ip => {
    totalCurrentCost += ip.costEstimation;

    // Heuristic: Unassociated EIPs are billed hourly by AWS
    if (ip.status === 'unassociated') {
      const savings = ip.costEstimation;
      totalPotentialSavings += savings;

      recommendations.push({
        resourceId: ip.resourceId,
        resourceName: ip.resourceName,
        resourceType: 'EIP',
        region: ip.region,
        status: ip.status,
        metrics: {},
        costEstimation: ip.costEstimation,
        potentialSavings: savings,
        optimizationStatus: 'orphaned',
        recommendation: `Release unassociated Elastic IP address '${ip.resourceName}'`
      });
    }
  });

  // 4. Evaluate S3 Buckets
  s3Buckets.forEach(bucket => {
    totalCurrentCost += bucket.costEstimation;

    // Heuristic: Temporary, sandbox, or test buckets with long periods of inactivity
    const isTempBucket = bucket.resourceName.includes('temp') || bucket.resourceName.includes('scratch') || bucket.resourceName.includes('test');
    
    // Check if the last accessed date is older than 30 days (simulated timestamp)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const isInactive = bucket.metrics.lastAccessed && new Date(bucket.metrics.lastAccessed).getTime() < thirtyDaysAgo;

    if (isTempBucket || isInactive) {
      const savings = bucket.costEstimation;
      totalPotentialSavings += savings;

      recommendations.push({
        resourceId: bucket.resourceId,
        resourceName: bucket.resourceName,
        resourceType: 'S3',
        region: bucket.region,
        status: 'active',
        metrics: {
          sizeGB: bucket.metrics.sizeGB,
          lastAccessed: bucket.metrics.lastAccessed
        },
        costEstimation: bucket.costEstimation,
        potentialSavings: savings,
        optimizationStatus: isTempBucket ? 'orphaned' : 'idle',
        recommendation: `Clean up inactive or temporary S3 bucket '${bucket.resourceName}' (${bucket.metrics.sizeGB} GB)`
      });
    }
  });

  return {
    recommendations,
    summary: {
      totalEstimatedMonthlyCost: parseFloat(totalCurrentCost.toFixed(2)),
      totalPotentialSavings: parseFloat(totalPotentialSavings.toFixed(2))
    }
  };
}

module.exports = {
  analyzeResources
};
