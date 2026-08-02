/**
 * Slot-machine filler for the concept reel.
 *
 * These never get graded — they exist so the reel has something to flick
 * through the instant START is pressed, while the real concept is still in
 * flight. Hardcoded on the client on purpose: the animation must start on the
 * same frame as the click, with no network in the way.
 */

import type { Concept } from "./drill";

export const DECOY_TITLES = [
  "Idempotency in APIs",
  "The CAP theorem, stated precisely",
  "Database sharding",
  "Cache invalidation strategies",
  "Transaction isolation levels",
  "Optimistic vs pessimistic locking",
  "The N+1 query problem",
  "Write-ahead logging",
  "LSM trees vs B-trees",
  "Consistent hashing",
  "Distributed consensus: Raft and Paxos",
  "The saga pattern",
  "Event sourcing",
  "CQRS",
  "The transactional outbox pattern",
  "Two-phase commit",
  "Circuit breakers and bulkheads",
  "Exponential backoff and jitter",
  "Backpressure and flow control",
  "Thundering herd and retry storms",
  "Tail latency and why p99 dominates",
  "Clocks in distributed systems",
  "CRDTs",
  "Distributed locks and why they leak",
  "Rate limiting algorithms",
  "Token bucket vs leaky bucket",
  "Connection pooling",
  "Query execution plans",
  "Composite index column order",
  "MVCC and VACUUM",
  "Bloom filters",
  "Replication lag",
  "Quorum reads and writes",
  "Read-your-writes consistency",
  "Zero-downtime schema migrations",
  "Expand, migrate, contract",
  "Blue-green vs canary deploys",
  "Graceful shutdown",
  "Health checks that actually check",
  "Service discovery",
  "The API gateway pattern",
  "Monolith vs microservices",
  "gRPC and protocol buffers",
  "WebSockets vs SSE",
  "Webhook delivery and retries",
  "At-least-once delivery",
  "Dead-letter queues",
  "Kafka vs RabbitMQ",
  "Background job design",
  "Cron in a multi-instance deploy",
  "OAuth 2.0 with PKCE",
  "Refresh token rotation",
  "JWT revocation",
  "Sessions vs stateless tokens",
  "RBAC vs ABAC",
  "CSRF and SameSite cookies",
  "CORS preflight",
  "SQL injection and prepared statements",
  "Password hashing with argon2",
  "Secrets rotation without downtime",
  "Multi-tenant data isolation",
  "Row-level security",
  "Full-text search and inverted indexes",
  "Vector search and HNSW",
  "RAG chunking strategy",
  "Cursor vs offset pagination",
  "HTTP caching headers",
  "ETags and conditional requests",
  "Presigned upload URLs",
  "SLIs, SLOs, and error budgets",
  "Logs, metrics, and traces",
  "Autoscaling on the wrong signal",
  "Kubernetes requests and limits",
  "Capacity planning",
  "Blameless postmortems",
] as const;

/**
 * Landing pad for the reel if the server hasn't answered in time. Real,
 * gradeable concepts whose ids exist in the server's bank — a fallback that
 * can't be graded would be worse than a slow spin.
 */
export const FALLBACK_CONCEPTS: Concept[] = [
  {
    id: "c-idempotency",
    title: "Idempotency in APIs",
    level: "intermediate",
    tags: ["api", "reliability", "http"],
    probes: [
      "Why is PUT idempotent but POST isn't?",
      "How would you implement an idempotency key for payments?",
    ],
  },
  {
    id: "c-cache-invalidation",
    title: "Cache invalidation strategies",
    level: "intermediate",
    tags: ["caching", "performance"],
    probes: [
      "TTL, write-through, write-behind, explicit bust — pick per use case.",
      "How do you avoid serving stale data after a write?",
    ],
  },
  {
    id: "c-http-methods",
    title: "HTTP methods and what each one promises",
    level: "beginner",
    tags: ["http", "rest", "api"],
    probes: ["Which methods are safe, and which are idempotent?", "When would you use PATCH instead of PUT?"],
  },
  {
    id: "c-cap-theorem",
    title: "The CAP theorem, stated precisely",
    level: "advanced",
    tags: ["distributed", "theory"],
    probes: ["What does the P actually mean, and why is 'pick two' misleading?", "How does PACELC extend it?"],
  },
];

/** A fallback at the requested level where possible, so the badge doesn't lie. */
export function fallbackConcept(level: string): Concept {
  const match = FALLBACK_CONCEPTS.find((c) => c.level === level);
  return match ?? FALLBACK_CONCEPTS[0]!;
}
