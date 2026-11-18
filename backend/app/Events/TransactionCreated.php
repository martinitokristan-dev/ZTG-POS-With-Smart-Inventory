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

class TransactionCreated implements ShouldBroadcast, ShouldDispatchAfterCommit
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /** @var array{id: int, cashier_id: int|null, status: string|null} */
    public array $transaction;

    /**
     * Create a new event instance.
     *
     * Every Admin, Supervisor and Cashier on the channel receives this, so it carries only a
     * "something changed" signal. Screens refetch through the API, which applies cashier
     * isolation; customer names, items and amounts never travel to other cashiers' browsers.
     */
    public function __construct(Transaction $transaction)
    {
        $this->transaction = TransactionUpdated::signal($transaction);
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
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
        return 'TransactionCreated';
    }
}
