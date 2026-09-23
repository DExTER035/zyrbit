import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Legacy Food page route.
 * Redirects directly to the unified Health domain (/health).
 */
export default function Food() {
  return <Navigate to="/health" replace />;
}
