// Load environment variables from .env file
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON body parsing middleware
app.use(cors());
app.use(express.json());

// Initialize AWS EC2 Client
// By default, the SDK automatically picks up AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
// and AWS_REGION from process.env, keeping credential handling secure.
const ec2Client = new EC2Client();

/**
 * GET /api/scan-ec2
 * Fetches all EC2 instances and groups them into 'active' (running) and 'waste' (stopped).
 */
app.get('/api/scan-ec2', async (req, res) => {
  try {
    // Command to describe all instances in the configured region
    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);

    const active = [];
    const waste = [];

    // Parse the AWS Response reservations list
    if (response.Reservations) {
      for (const reservation of response.Reservations) {
        if (reservation.Instances) {
          for (const instance of reservation.Instances) {
            // Extract the core details required
            const instanceDetails = {
              id: instance.InstanceId,
              type: instance.InstanceType,
              state: instance.State ? instance.State.Name : 'unknown',
              launchTime: instance.LaunchTime
            };

            // Heuristics: separate 'running' (active) from 'stopped' (waste/unused candidates)
            if (instanceDetails.state === 'running') {
              active.push(instanceDetails);
            } else if (instanceDetails.state === 'stopped') {
              waste.push(instanceDetails);
            }
          }
        }
      }
    }

    // Return the response structured as specified
    return res.json({
      success: true,
      summary: {
        activeCount: active.length,
        wasteCount: waste.length,
        totalCount: active.length + waste.length
      },
      active,
      waste
    });

  } catch (error) {
    console.error('Error fetching EC2 instances from AWS SDK:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve EC2 metrics from AWS environment.',
      error: error.message
    });
  }
});

/**
 * POST /api/validate-aws
 * Validates AWS credentials using STS GetCallerIdentityCommand
 */
app.post('/api/validate-aws', async (req, res) => {
  const { accessKeyId, secretAccessKey } = req.body;

  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ success: false, message: "Access Key ID and Secret Access Key are required" });
  }

  try {
    const client = new STSClient({
      region: "us-east-1",
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });
    const command = new GetCallerIdentityCommand({});
    const data = await client.send(command);

    res.json({
      success: true,
      message: "Valid Credentials",
      account: data.Account
    });
  } catch (error) {
    console.log("AWS SDK Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Invalid credentials"
    });
  }
});

/**
 * POST /api/get-dashboard-data
 * Fetches real EC2 instances using provided AWS credentials and region,
 * and provides mock fallback data for service billing cost charts.
 */
app.post('/api/get-dashboard-data', async (req, res) => {
  const { accessKeyId, secretAccessKey, region } = req.body;

  if (!accessKeyId || !secretAccessKey) {
    return res.status(400).json({ success: false, message: "Access Key ID and Secret Access Key are required" });
  }

  try {
    const ec2Client = new EC2Client({
      region: region || "us-east-1",
      credentials: {
        accessKeyId,
        secretAccessKey
      }
    });

    const command = new DescribeInstancesCommand({});
    const response = await ec2Client.send(command);

    const instances = [];
    let runningCount = 0;

    if (response.Reservations) {
      for (const reservation of response.Reservations) {
        if (reservation.Instances) {
          for (const instance of reservation.Instances) {
            const state = instance.State ? instance.State.Name : 'unknown';
            if (state === 'running') {
              runningCount++;
            }
            
            const type = instance.InstanceType || 't3.micro';
            let costEst = 30.00;
            if (type.includes('xlarge')) costEst = 130.00;
            else if (type.includes('large')) costEst = 65.00;
            else if (type.includes('medium')) costEst = 32.00;
            else if (type.includes('micro') || type.includes('nano')) costEst = 8.00;

            instances.push({
              id: instance.InstanceId,
              type: type,
              region: region || 'us-east-1',
              cost: state === 'running' ? costEst : 0.00,
              state: state
            });
          }
        }
      }
    }

    res.json({
      success: true,
      activeResourcesCount: runningCount,
      ec2Instances: instances,
      serviceCosts: [
        { service: "EC2", cost: 1245.50, percentage: 47 },
        { service: "RDS", cost: 650.00, percentage: 24 },
        { service: "S3", cost: 480.20, percentage: 18 },
        { service: "EBS", cost: 180.30, percentage: 7 },
        { service: "Others", cost: 95.80, percentage: 4 }
      ]
    });
  } catch (error) {
    console.error("AWS SDK Error in get-dashboard-data:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch dashboard data"
    });
  }
});

// Start listening for API requests
app.listen(PORT, () => {
  console.log(`Server successfully started. Listening on http://localhost:${PORT}`);
});
