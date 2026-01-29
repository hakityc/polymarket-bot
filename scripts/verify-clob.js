const { getClient } = require('../src/client');
const logger = require('../src/utils/logger');

async function test() {
    try {
        logger.info("Testing CLOB Client connection...");
        const client = getClient();
        
        logger.info("Calling getOk()...");
        const status = await client.getOk();
        logger.info(`Status: ${JSON.stringify(status)}`);

        if (status.ok) {
            logger.success("CLOB Connection OK");
        } else {
            logger.error("CLOB Connection Failed");
        }

        try {
            logger.info("Verifying API Keys...");
            const keys = await client.getApiKeys();
            logger.info("API Keys Validated");
        } catch (e) {
            logger.error(`API Key Validation Failed: ${e.message}`);
        }

    } catch (e) {
        logger.error(`Test Failed: ${e.message}`);
    }
}

test();
