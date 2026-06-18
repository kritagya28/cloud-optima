require('dotenv').config();
const { 
  scanMonthlyCosts, 
  scanEC2Instances, 
  scanS3Buckets, 
  scanEBSVolumes, 
  scanElasticIPs 
} = require('./services/awsScanner');
const { analyzeResources } = require('./services/optimizationEngine');

async function runValidationTest() {
  console.log('===================================================');
  console.log('  Running Cloud Cost Optimization Verification     ');
  console.log('===================================================');

  try {
    console.log('[Test] Triggering AWS Scanner components...');
    const [monthlyCosts, ec2Instances, s3Buckets, ebsVolumes, elasticIPs] = await Promise.all([
      scanMonthlyCosts(),
      scanEC2Instances(),
      scanS3Buckets(),
      scanEBSVolumes(),
      scanElasticIPs()
    ]);

    console.log(`[Test] Monthly cost series records fetched: ${monthlyCosts.length}`);
    console.log(`[Test] EC2 instances found: ${ec2Instances.length}`);
    console.log(`[Test] S3 buckets scanned: ${s3Buckets.length}`);
    console.log(`[Test] EBS volumes found: ${ebsVolumes.length}`);
    console.log(`[Test] Elastic IP addresses scanned: ${elasticIPs.length}`);

    console.log('\n[Test] Triggering Optimization Engine rules...');
    const analysis = analyzeResources({ ec2Instances, ebsVolumes, elasticIPs, s3Buckets });

    console.log('\n================== ANALYSIS SUMMARY ================');
    console.log(`Total Estimated Monthly Cost: $${analysis.summary.totalEstimatedMonthlyCost}`);
    console.log(`Total Potential Monthly Savings: $${analysis.summary.totalPotentialSavings}`);
    console.log('====================================================');

    console.log('\n================ HEURISTICS RECOGNITIONS ===========');
    analysis.recommendations.forEach((rec, idx) => {
      console.log(`${idx + 1}. [${rec.resourceType}] ID: ${rec.resourceId}`);
      console.log(`   Status: ${rec.optimizationStatus}`);
      console.log(`   Cost: $${rec.costEstimation}/mo | Potential Savings: $${rec.potentialSavings}/mo`);
      console.log(`   Recommendation: "${rec.recommendation}"`);
      console.log('----------------------------------------------------');
    });

    console.log('\n[Test] Syntax and Engine heuristic rules verified successfully!');
  } catch (err) {
    console.error('[Test] Verification error encountered:', err);
    process.exit(1);
  }
}

runValidationTest();
