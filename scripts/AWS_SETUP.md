# AWS IAM Role Setup for Tavus Recordings

Tavus writes recordings directly to your S3 bucket using federated identity (no AWS credentials are shared). You need to create an IAM role that Tavus's recording infrastructure (operated through Daily.co, AWS account `291871421005`) can assume to write recordings to your bucket.

## Prerequisites

- S3 bucket created (you already have this)
- AWS IAM access (admin or IAM permissions)

## Step 1: Create the IAM Role

1. Log into **AWS Console** → **IAM** → **Roles** → **Create role**
2. Choose **Custom trust policy**
3. Paste this trust policy (no edits needed):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::291871421005:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "tavus"
        }
      }
    }
  ]
}
```

4. Click **Next**
5. **Skip attaching policies for now** — click **Next** again
6. Role name: `TavusRecordingWriter`
7. **CRITICAL**: Scroll down and find **Maximum session duration** — change it from default (1 hour) to **12 hours**
   - If you don't see this option on the create page, you'll need to edit the role after creation: Role → **Edit** → set max session duration to 43200 seconds (12 hours)
8. Click **Create role**

## Step 2: Attach the Permissions Policy

1. Find your new `TavusRecordingWriter` role
2. Click **Add permissions** → **Create inline policy**
3. Switch to **JSON** view
4. Paste this — **replace `your-bucket-name` (TWICE) with your actual bucket name**:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:ListBucketMultipartUploads",
        "s3:AbortMultipartUpload",
        "s3:ListBucketVersions",
        "s3:ListBucket",
        "s3:GetObjectVersion",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

5. Click **Next** → Policy name: `TavusRecordingWriter-S3-Access` → **Create policy**

## Step 3: Verify the Max Session Duration

This is the most common gotcha. Tavus's recording service requests 12-hour sessions when assuming the role, and the default 1-hour will fail silently.

1. Go to your `TavusRecordingWriter` role
2. Look at the **Summary** section
3. Confirm **Maximum session duration: 12 hours**

If it shows 1 hour, click **Edit** and change it.

## Step 4: Create Read-Only IAM User for App

This is a SEPARATE user/credential — used by the Next.js app to **stream recordings to admins** (it reads from S3, doesn't write).

1. **IAM** → **Users** → **Create user**
2. Name: `talentgauge-app-reader`
3. **Don't** attach AWS Management Console access
4. **Next** → **Attach policies directly** → **Create policy**
5. JSON tab, paste this (replace bucket name twice):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    }
  ]
}
```

6. Policy name: `TalentGauge-S3-Read`
7. Save policy, attach to the user, finish user creation
8. After creation, click into the user → **Security credentials** → **Create access key** → **Application running outside AWS**
9. **COPY THESE IMMEDIATELY** — you won't see them again:
   - **Access key ID**: starts with `AKIA...`
   - **Secret access key**: long random string

## Step 5: Gather These Values for Your .env

You'll need these values for your Vercel environment variables:

```
# For Tavus to write recordings to your bucket
RECORDING_S3_BUCKET=your-bucket-name
RECORDING_S3_REGION=us-east-1
RECORDING_S3_ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/TavusRecordingWriter

# For the app to stream recordings to admins
AWS_S3_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=long-secret-here
```

## Finding Your Account ID and ARN

- **Account ID**: Top-right corner of AWS Console — 12-digit number
- **Role ARN**: Go to IAM → Roles → click `TavusRecordingWriter` → it's shown at the top, formatted like:
  `arn:aws:iam::123456789012:role/TavusRecordingWriter`

## Quick Sanity Check

Once you have everything set up, you can verify the role works by attempting to assume it (advanced — optional):

```bash
aws sts assume-role \
  --role-arn arn:aws:iam::YOUR_ACCOUNT_ID:role/TavusRecordingWriter \
  --role-session-name test \
  --external-id tavus \
  --duration-seconds 43200
```

If the max session duration isn't 12 hours, this command will fail.

If it succeeds, you're good. Now proceed to add the environment variables to Vercel and redeploy.

## Common Errors

- **"unable to assume role with given parameters"** → Max session duration is wrong. Set to 43200 seconds (12 hours).
- **"AccessDenied"** → Trust policy missing the ExternalId condition, or it's not exactly "tavus" (case-sensitive).
- **Recording fails silently** → Bucket name in permissions policy doesn't match actual bucket, or region mismatch.
