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

## Feature modules (`includes/features/`)

- `checkout-extension.php` – `Bohemia_Checkout_Extension`, Store API extension (namespace `bohemia`):
  - `POST /wc/store/v1/cart/extensions` `{ namespace: 'bohemia', data: { payment_method?, pickup_point? } }` stores the chosen payment gateway (`chosen_payment_method`) and the Zásilkovna pickup point (`bohemia_pickup_point`) in the WC session and returns the cart; cart response contains `extensions.bohemia = { chosen_payment_method, pickup_point, cod_fee }`.
  - Fee „Dobírka“ (`cod_fee` setting, non-taxable) is added on `woocommerce_cart_calculate_fees` when the chosen payment method is `cod`. The payment method from `POST /wc/store/v1/checkout` is synced into the session on `woocommerce_store_api_checkout_update_customer_from_request` (before the draft order recalculates the cart), so the fee is always consistent with the gateway used.
  - `POST /wc/store/v1/checkout` accepts `extensions.bohemia = { pickup_point: PickupPoint|null, ico, dic }`; on `woocommerce_store_api_checkout_update_order_from_request` it validates the pickup point when the shipping method is `bohemia_zasilkovna` (400 `bohemia_pickup_point_required`) and writes order meta `_bohemia_packeta_point` (array), `_bohemia_packeta_point_id`, `_bohemia_ico`, `_bohemia_dic` plus shipping line meta „Výdejní místo“.
  - Admin order meta box „Bohemia – zákazník / doručení“ (legacy + HPOS screens) and e-mail block (`woocommerce_email_order_meta`).
- `order-api.php` – `Bohemia_Order_Api`: `GET /order/{id}?key={order_key}` (403 on wrong key, 404 unknown, rate limited) returns the order summary for the confirmation page (amounts in Kč, `bacs` block for bank transfer, `tracking` from `_bohemia_packeta_barcode`/`_bohemia_tracking_url`). Helper `Bohemia_Order_Api::get_order_or_error( $id, $key )` returns `WC_Order|WP_Error` for other modules.
- `contact.php` – `Bohemia_Contact`: `POST /contact` `{ name, email, phone, message, hp }` → `{ status: 'sent' }` (honeypot `hp`, rate limited, mail to `contact_email` with Reply-To sender).

## Writing a feature module

```php
<?php // includes/features/my-feature.php
class Bohemia_My_Feature {
    public static function init() { /* add hooks */ }
}
add_action( 'bohemia_wc_init', array( 'Bohemia_My_Feature', 'init' ) );
add_action( 'bohemia_register_rest_routes', function () { register_rest_route( BOHEMIA_REST_NS, '/my-route', [...] ); } );
```
