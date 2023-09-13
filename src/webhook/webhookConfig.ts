import alert from 'cli-alerts';
import { Env } from '../utils/env.js';

export default async function webhookConfig() {
    const webhookURL = Env.required("WEBHOOK_URL");
    const webhookTimeout = Env.optional("WEBHOOK_TIMEOUT", "10000");

    const webhookSecret = Env.optional("WEBHOOK_SECRET", null);
    // Further configuration like headers, authentication, etc. can be added here if needed

    // Verify that the url is valid
    try {
        new URL(webhookURL);
    } catch (error) {
        alert({
            type: `error`,
            name: `Webhook URL is not valid: ${webhookURL}`,
            msg: `\n  ${error.message}`
        });
        process.exit(1);
    }

    return {
        url: webhookURL,
        timeout: webhookTimeout,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': webhookSecret,
        }
    };
}
