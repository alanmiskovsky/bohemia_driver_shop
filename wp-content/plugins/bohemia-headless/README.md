# Bohemia Driver Shop – Headless (WordPress plugin)

Backend glue for the React frontend in `/frontend`. Requires WooCommerce.

## Structure

- `bohemia-headless.php` – bootstrap; loads core classes and every `includes/features/*.php` module after WooCommerce.
- `includes/class-bohemia-settings.php` – **WooCommerce ▸ Bohemia Shop** settings page. Any setting can be overridden by a constant or env var `BOHEMIA_<KEY>` (e.g. `BOHEMIA_FRONTEND_URL`).
- `includes/class-bohemia-urls.php` – rewrites WooCommerce/WordPress URLs (e-mails, order received, pay, product permalinks…) to frontend routes.
- `includes/class-bohemia-rest.php` – `bohemia/v1` REST namespace: `GET /config`, `POST /newsletter`, `POST /newsletter/unsubscribe`; helpers `Bohemia_Rest::error()`, `Bohemia_Rest::rate_limit()`; action `bohemia_register_rest_routes` for modules; filter `bohemia_public_config`.
- `includes/class-bohemia-newsletter.php` – subscribers CPT, CSV export.
- `includes/class-bohemia-mail.php` – SMTP from env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_FROM_NAME`).
- `includes/class-bohemia-setup.php` – one-time defaults (CZK, COD + bank transfer, CZ shipping zone, legal pages). Re-run with `wp bohemia setup [--force]`.

## Writing a feature module

```php
<?php // includes/features/my-feature.php
class Bohemia_My_Feature {
    public static function init() { /* add hooks */ }
}
add_action( 'bohemia_wc_init', array( 'Bohemia_My_Feature', 'init' ) );
add_action( 'bohemia_register_rest_routes', function () { register_rest_route( BOHEMIA_REST_NS, '/my-route', [...] ); } );
```
