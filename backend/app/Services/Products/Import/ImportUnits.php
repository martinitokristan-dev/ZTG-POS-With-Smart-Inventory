<?php

namespace App\Services\Products\Import;

/**
 * Default units of measure, identical to the frontend fallback list used when the
 * `units_of_measure` setting has never been saved.
 */
class ImportUnits
{
    /** @var string[] */
    public const DEFAULTS = ['Piece / PCS', 'Unit', 'Roll', 'Meter / m', 'Set', 'Box', 'Pack', 'Pair', 'Kilogram / kg', 'Liter / L'];
}
