# Travelbase Backend — Intern Training Program

**Maintained by:** Michael Awoniran, Backend & Distributed Systems Engineer  
**Institution:** University of Doha for Science and Technology (UDST), Qatar  
**Format:** 10-week intensive, daily sessions  
**Stack:** Node.js · Fastify · PostgreSQL · Prisma ORM · Redis · Docker · TypeScript

---

## Program Philosophy

> "We do not train interns — we build engineers."

Every task in this program is a production-level simulation. Students are expected to understand what they build, defend their architectural choices, and document their work rigorously. If it is not written, it does not exist.

Daily written reports are mandatory throughout the program:
- What I worked on
- What I struggled with
- What I learned
- What I will do next

---

## What This Repository Is

This is the backend codebase used as the training environment throughout the program. Students fork this repository, complete daily deliverables against it, and submit work via pull requests for structured code review.

This is **not a full production system** — it is a structured engineering incubator built to expose students to how production backend systems are actually designed, built, tested, and operated. By the end of Week 8, students will have built a distributed, observable, and resilient flight search system from the ground up.

---

## Program Structure

### Phase 1 — Foundations & Intensity (Weeks 1–3)

#### Week 1: Engineering Standards & Rigor

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Environment & PRs | "The Perfect PR": HealthCheck endpoint with 100% coverage + README |
| 2 | RFC/ADR Writing | Technical design doc: Flight Search schema. SQL vs NoSQL tradeoff analysis |
| 3 | Git & Refactoring | Refactor legacy codebase. Atomic commits and DRY principles |
| 4 | API Design | Design `GET /search` contract: query params, pagination, error codes |
| 5 | Review | Design Defense: Present ADR to senior staff and defend architectural choices |

#### Week 2: Technical Depth & Persistence

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Schema Implementation | Database migrations for Airports, Flights, and Bookings |
| 2 | Seed Data | Generate 10k randomized flights. Enforce integrity constraints (no ghost flights) |
| 3 | CRUD Foundations | Internal admin API for flight management with strict type validation |
| 4 | Testing Patterns | Unit and integration tests using the AAA (Arrange-Act-Assert) pattern |
| 5 | Performance | Query profiling: identify slow searches and implement database indexing |

#### Week 3: The Mini Flight Search Build

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Search Engine | Core logic for Origin-to-Destination filtering |
| 2 | Complex Filtering | Price ranges, airline filters, and multi-hop routing logic |
| 3 | Optimization | Implement DTOs to abstract internal DB structures from API consumers |
| 4 | Error Resilience | Graceful handling for "No flights found" and upstream timeout errors |
| 5 | The Demo | Functional search tool presentation. Final evaluation of Phase 1 foundations |

---

### Phase 2 — Assisted Contribution (Weeks 4–8)

#### Week 4: Caching & Latency

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Redis Integration | Implement caching for "Popular Routes" to bypass DB overhead |
| 2 | Cache Invalidation | Logic to update/purge cache when flight prices change in the DB |
| 3 | Benchmarking | Load testing with k6/Locust. Establish baseline RPS (Requests Per Second) |
| 4 | Latency | Optimization sprint: reduce P99 latency by 20% via code/query refactoring |
| 5 | Sync | Deep dive: tradeoffs of eventual consistency in distributed systems |

#### Week 5: Resilience & Reliability

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Idempotency | Booking logic: ensure duplicate requests do not result in double charges |
| 2 | Rate Limiting | Bot protection for search API using sliding window algorithms |
| 3 | Graceful Degradation | Circuit breakers: ensure search works even if secondary services fail |
| 4 | Background Jobs | Async processing: message queues for booking confirmation emails |
| 5 | Chaos Simulation | "The Server Crash": recovering local state from simulated DB failure |

#### Week 6: Observability

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Structured Logging | JSON logging with `trace_id` for end-to-end request tracking |
| 2 | Metrics | Prometheus/Grafana setup for search latency and booking success rates |
| 3 | Probes | Kubernetes-style liveness and readiness probes implementation |
| 4 | Alerting | Threshold logic for automated engineer paging |
| 5 | Log Analysis | Root cause analysis (RCA) exercise on "invisible" production bugs |

#### Week 7: Security & Edge Cases

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | Auth Middleware | Secure Booking API with JWT/Session tokens |
| 2 | Sanitization | Security audit: prevent SQL injection in search parameters |
| 3 | Race Conditions | Solving the "Last Seat" problem using row-level locking and transactions |
| 4 | Data Privacy | Encryption at rest for PII (passport numbers, names) |
| 5 | Security Review | Peer-to-peer security auditing: finding vulnerabilities in peer code |

#### Week 8: The Production Push

| Day | Focus | Deliverable |
|-----|-------|-------------|
| 1 | CI/CD | Automated pipelines for linting, testing, and formatting on push |
| 2 | Containerization | Dockerize the full flight search stack (App, DB, Redis) |
| 3 | Documentation | The Runbook: comprehensive guide to scaling and operating the system |
| 4 | Final Load Test | Identify the "Breaking Point" of the system and document bottlenecks |
| 5 | Graduation | Final presentation: the production-ready flight system |

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

Server runs at `http://localhost:3000`

### 3. Run Tests

```bash
npm run test
```

### 4. Start with Docker (includes Postgres + Redis)

```bash
docker-compose up
```

---

## Project Structure

```
src/
├── routes/      # API endpoint definitions
├── services/    # Business logic
├── plugins/     # Fastify plugins (auth, rate limiting, etc.)
├── utils/       # Helper functions
└── server.ts    # Entry point

prisma/
├── schema.prisma   # Database schema
└── migrations/     # Migration history
```

---

## Engineering Standards

Every student in this program is held to the following non-negotiable standards:

- **Pull Requests only** — no direct pushes to main under any circumstance
- **Daily written reports** — submitted at end of each session without exception
- **ADR-first development** — architectural decisions documented before implementation begins
- **Test coverage enforced** — PRs without adequate unit and integration tests are not approved
- **Design defenses** — students present and verbally defend their architectural choices to senior staff
- **Code ownership** — students must understand every line they submit; no blind copying

---

## Final Outcome

By the end of Week 10, a student who has completed this program will have:

- Built a distributed flight search system with caching, auth, and background job processing
- Written production-grade unit and integration tests with enforced coverage thresholds
- Instrumented a system with structured logging, metrics dashboards, and alerting
- Hardened an API against SQL injection, race conditions, and duplicate request attacks
- Shipped via automated CI/CD pipelines with full Docker containerization
- Documented a production runbook and presented a live load-tested system

They are no longer a student. They are ready for production.

---

## Resources

- [Fastify Docs](https://fastify.dev/docs/latest/)
- [Prisma Docs](https://www.prisma.io/docs)
- [Node.js Docs](https://nodejs.org/en/docs)
- [Redis Docs](https://redis.io/docs)
- [k6 Load Testing](https://k6.io/docs/)
- [Prometheus](https://prometheus.io/docs/introduction/overview/)