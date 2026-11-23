import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// Every data page is rendered per request (force-dynamic), so no incremental cache bucket is needed.
export default defineCloudflareConfig({});
