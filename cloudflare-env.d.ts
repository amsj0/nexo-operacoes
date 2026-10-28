declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    NEXO_PARTNER_ADMIN_EMAILS?: string;
  }
}
