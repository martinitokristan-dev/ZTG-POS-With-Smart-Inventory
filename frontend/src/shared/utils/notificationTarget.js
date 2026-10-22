/**
 * Decide which page a notification's "View" button opens.
 *
 * Handles both current links and links saved by older versions, which pointed at
 * pages that don't exist (/products/{id}, /reservations/{id}, /reports/sales) and
 * made the router fall through to the login screen.
 *
 * | Notification                                   | Opens                                  |
 * |------------------------------------------------|----------------------------------------|
 * | Any transaction (refund, void, damaged, ...)   | /history-logs?highlight={transaction}  |
 * | Low / out of stock, dead stock                 | /inventory?highlight={product}         |
 * | Reservation expired                            | /reservations?view={reservation}       |
 * | Daily sales reminder                           | /reports                               |
 * | Anything else with an in-app link              | the link itself                        |
 *
 * @param {Object} notification Mapped notification (link, transaction_id, product_id).
 * @returns {string|null} In-app path to open, or null when there is nothing to open.
 */
export function resolveNotificationTarget(notification) {
    if (!notification) return null;

    const link = String(notification.link || '').trim();
    const idFrom = (pattern) => {
        const match = link.match(pattern);
        return match ? Number(match[1]) : null;
    };

    // History Logs lists every transaction type, and it can find any of them by page.
    const transactionId = notification.transaction_id || idFrom(/^\/transactions\/(\d+)/);
    if (transactionId) return `/history-logs?highlight=${transactionId}`;

    const productId = notification.product_id
        || idFrom(/^\/products\/(\d+)/)
        || idFrom(/^\/inventory\?(?:.*&)?highlight=(\d+)/);
    if (productId) return `/inventory?highlight=${productId}`;

    const reservationId = idFrom(/^\/reservations\/(\d+)/) || idFrom(/^\/reservations\?(?:.*&)?view=(\d+)/);
    if (reservationId) return `/reservations?view=${reservationId}`;

    if (link === '/reports/sales') return '/reports';

    // Only follow in-app paths; never navigate to an absolute URL from notification data.
    if (link.startsWith('/') && !link.startsWith('//')) return link;

    return null;
}
