# Cloud Cost Optimization Dashboard (CloudCost)

A full-stack application to analyze AWS resource usage and identify cost-saving opportunities.

## Tech Stack
- **Frontend:** React.js
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **Cloud:** AWS SDK for JavaScript (v3)

## Environment Variables
Create a `.env` file in the root directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27001/cloudcost
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_access_key
# Use existing client secret, do not generate a new one
CLIENT_SECRET=your_existing_client_secret
```

## Setup Instructions
1. **Clone the repo**
2. **Install Dependencies:** `npm install` (root, frontend, and backend)
3. **Database:** Ensure MongoDB is running.
4. **AWS Setup:** Attach an IAM policy with `ReadOnlyAccess` to Cost Explorer and CloudWatch to the provided credentials.
5. **Run Development:** `npm run dev`

## Deployment
- **Frontend:** Vercel or AWS Amplify.
- **Backend:** AWS App Runner or Heroku.
- **Database:** MongoDB Atlas.
