// src/bundles/birth-chart.bundle.js

/* ============================================================================
 * ZODIKA • Birth Chart Bundle
 * ----------------------------------------------------------------------------
 * Entry point for initializing the Birth Chart form application.
 *
 * Responsibilities
 * - Load the product-specific configuration
 * - Mount the form application using the shared form-app module
 * - Ensure the form is initialized once the DOM is ready
 *
 * ========================================================================== */

import birthChartConfig from '../products/birth-chart.config.js';
import { mountFormApp } from '../core/form-app.js';

mountFormApp(birthChartConfig);
