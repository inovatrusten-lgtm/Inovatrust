import Mailgun from "mailgun.js";
import formData from "form-data";

const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN || "sandbox.mailgun.org";
const FROM_EMAIL = process.env.MAILGUN_FROM_EMAIL || "noreply@inovatrust.net";

let mailgun: any = null;

if (MAILGUN_API_KEY) {
  const mg = new Mailgun(formData);
  mailgun = mg.client({
    username: "api",
    key: MAILGUN_API_KEY,
  });
}

interface WithdrawalReceiptData {
  userEmail: string;
  userName: string;
  invoiceNumber: string;
  amount: string;
  method: string;
  walletAddress: string;
  processedAt: Date;
}

export async function sendWithdrawalReceipt(data: WithdrawalReceiptData): Promise<boolean> {
  if (!mailgun || !MAILGUN_API_KEY) {
    console.log("Mailgun API key not configured, skipping email");
    return false;
  }

  const methodLabels: Record<string, string> = {
    usdt: "USDT (BEP20)",
    bitcoin: "Bitcoin (BTC)",
    ethereum: "Ethereum (ETH)",
    usdt_trc20: "USDT (TRC20)",
    bank: "Bank Transfer",
  };

  const formattedAmount = parseFloat(data.amount).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });

  const formattedDate = data.processedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Withdrawal Receipt - InovaTrust</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background-color: #141414; border-radius: 12px; overflow: hidden;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid #262626;">
              <div style="display: inline-flex; align-items: center; gap: 12px;">
                <div style="width: 40px; height: 40px; background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); border-radius: 8px; display: flex; align-items: center; justify-content: center;">
                  <span style="color: white; font-size: 20px;">★</span>
                </div>
                <span style="color: #ffffff; font-size: 24px; font-weight: 700;">InovaTrust</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <h1 style="margin: 0 0 8px; color: #22c55e; font-size: 28px; font-weight: 600; text-align: center;">
                Withdrawal Approved
              </h1>
              <p style="margin: 0 0 30px; color: #a3a3a3; font-size: 16px; text-align: center;">
                Your withdrawal request has been successfully processed
              </p>
              
              <div style="background-color: #1a1a1a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                      <span style="color: #737373; font-size: 14px;">Invoice Number</span><br>
                      <span style="color: #ffffff; font-size: 16px; font-weight: 600;">${data.invoiceNumber}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                      <span style="color: #737373; font-size: 14px;">Amount</span><br>
                      <span style="color: #22c55e; font-size: 24px; font-weight: 700;">${formattedAmount}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                      <span style="color: #737373; font-size: 14px;">Payment Method</span><br>
                      <span style="color: #ffffff; font-size: 16px;">${methodLabels[data.method] || data.method}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; border-bottom: 1px solid #262626;">
                      <span style="color: #737373; font-size: 14px;">Destination Address</span><br>
                      <span style="color: #f97316; font-size: 14px; word-break: break-all;">${data.walletAddress}</span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0;">
                      <span style="color: #737373; font-size: 14px;">Processed Date</span><br>
                      <span style="color: #ffffff; font-size: 16px;">${formattedDate}</span>
                    </td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0 0 20px; color: #a3a3a3; font-size: 14px; line-height: 1.6;">
                Dear ${data.userName},<br><br>
                Your withdrawal of ${formattedAmount} has been approved and processed. The funds have been sent to your ${methodLabels[data.method] || data.method} address. Please allow 1-24 hours for the transaction to be confirmed on the blockchain.
              </p>
              
              <p style="margin: 0; color: #737373; font-size: 12px; text-align: center;">
                If you have any questions, please contact our support team through the chat feature in your dashboard.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #0f0f0f; text-align: center;">
              <p style="margin: 0; color: #525252; font-size: 12px;">
                &copy; ${new Date().getFullYear()} InovaTrust. All rights reserved.<br>
                This is an automated email, please do not reply directly.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  try {
    await mailgun.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to: data.userEmail,
      subject: `Withdrawal Receipt - ${data.invoiceNumber}`,
      html: emailHtml,
    });
    console.log(`Withdrawal receipt sent to ${data.userEmail}`);
    return true;
  } catch (error: any) {
    console.error("Failed to send email:", error?.message || error);
    return false;
  }
}
