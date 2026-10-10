import * as dotenv from "dotenv";
dotenv.config();

const reviewer = process.env.REVIEWER_ADDRESS!;
const arbitrator = process.env.ARBITRATOR_ADDRESS!;
const feeRecipient = process.env.FEE_RECIPIENT_ADDRESS!;
const feeBps = 200;
const confidenceThreshold = 7500;
const highConfidenceBps = 9500;
const shortWindow = 30;
const longWindow = 90;
const verdictTimeout = 300;

export default [
  reviewer,
  arbitrator,
  feeRecipient,
  feeBps,
  confidenceThreshold,
  highConfidenceBps,
  shortWindow,
  longWindow,
  verdictTimeout,
];
