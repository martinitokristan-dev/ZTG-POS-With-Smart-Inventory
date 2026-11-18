<?php

namespace App\Events;

use App\Models\Transaction;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Contracts\Events\ShouldDispatchAfterCommit;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TransactionUpdated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @var array{id: int, cashier_id: int|null, status: string|null} */
    public array $transaction;

    /**
     * Create a new event instance.
     *
     * Only a "something changed" signal (see signal()); screens refetch through the API,
     * which applies cashier isolation.
     */
    public function __construct(Transaction $transaction)
    {
        $this->transaction = self::signal($transaction);
    }

    /**
     * The only transaction fields sent over the shared `transactions` channel.
     *
     * @param  Transaction $transaction
     * @return array{id: int, cashier_id: int|null, status: string|null}
     */
    public static function signal(Transaction $transaction): array
    {
        $status = $transaction->status;

        return [
            'id'         => (int) $transaction->id,
            'cashier_id' => $transaction->cashier_id !== null ? (int) $transaction->cashier_id : null,
            'status'     => is_object($status) ? $status->value : $status,
        ];
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('transactions'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'TransactionUpdated';
    }
}
