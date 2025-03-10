# Migration Guide

## Latest Migration: Research Assistant Integration

### Overview
This migration adds the Research Assistant system to analyze conversations and provide knowledge visualization.

### Steps

1. **Install Dependencies**
```bash
npm install react-force-graph-2d d3 nanoid date-fns
```

2. **Database Updates**
Add the following tables:

```sql
-- Themes table
CREATE TABLE IF NOT EXISTS themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  occurrences INTEGER DEFAULT 1,
  depth INTEGER DEFAULT 1
);

-- Theme connections table
CREATE TABLE IF NOT EXISTS theme_connections (
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  strength INTEGER DEFAULT 1,
  first_seen DATETIME NOT NULL,
  last_seen DATETIME NOT NULL,
  PRIMARY KEY (source_id, target_id),
  FOREIGN KEY (source_id) REFERENCES themes(id),
  FOREIGN KEY (target_id) REFERENCES themes(id)
);

-- Research insights table
CREATE TABLE IF NOT EXISTS research_insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence REAL NOT NULL,
  created_at DATETIME NOT NULL,
  metadata JSON
);

-- Theme feedback table
CREATE TABLE IF NOT EXISTS theme_feedback (
  id TEXT PRIMARY KEY,
  theme_id TEXT NOT NULL,
  feedback_type TEXT NOT NULL,
  feedback_data JSON,
  created_at DATETIME NOT NULL,
  FOREIGN KEY (theme_id) REFERENCES themes(id)
);
```

3. **Environment Variables**
Add to your .env file:

```env
NEXT_PUBLIC_ENABLE_RESEARCH=true
RESEARCH_ASSISTANT_MODEL=deepseek-coder
THEME_DETECTION_THRESHOLD=0.7
```

4. **Type Definitions**
Add the following to your TypeScript configuration:

```json
{
  "compilerOptions": {
    "types": [
      "react-force-graph-2d"
    ]
  }
}
```

5. **Update Next.js Config**
Add the following to your next.config.js:

```js
const nextConfig = {
  // ... existing config
  webpack: (config) => {
    config.externals.push({
      'react-force-graph-2d': 'ForceGraph2D',
    });
    return config;
  },
};
```

### Breaking Changes

1. **Chat System Updates**
- The chat context now includes research analysis
- Message handlers need to implement the new research interface
- Chat storage includes theme tracking

2. **API Changes**
- New research-related endpoints
- Updated chat response format
- Additional metadata in message objects

### Rollback Plan

1. **Database**
```sql
DROP TABLE IF EXISTS theme_feedback;
DROP TABLE IF EXISTS research_insights;
DROP TABLE IF EXISTS theme_connections;
DROP TABLE IF EXISTS themes;
```

2. **Code**
- Remove research-related components
- Revert chat system changes
- Remove environment variables

### Testing

1. **Unit Tests**
```bash
npm run test:research
```

2. **Integration Tests**
```bash
npm run test:integration
```

3. **Manual Testing Checklist**
- [ ] Theme detection works
- [ ] Knowledge map displays correctly
- [ ] Insights are generated
- [ ] Feedback system functions
- [ ] Performance is acceptable

### Performance Considerations

1. **Database Indexes**
```sql
CREATE INDEX idx_themes_name ON themes(name);
CREATE INDEX idx_theme_connections_source ON theme_connections(source_id);
CREATE INDEX idx_theme_connections_target ON theme_connections(target_id);
CREATE INDEX idx_research_insights_type ON research_insights(type);
```

2. **Caching**
- Theme graph is cached in memory
- Visualization data uses React.memo
- LLM responses are cached

### Monitoring

1. **New Metrics**
- Theme detection accuracy
- Graph rendering performance
- Insight generation time
- User feedback rates

2. **Alerts**
- High theme detection latency
- Low confidence insights
- Database query performance
- Memory usage spikes

## Previous Migrations

- [Context Management Migration](./TDR-001-CONTEXT-MANAGEMENT.md)
- [Error Recovery System](./TDR-002-ERROR-RECOVERY.md)
- [Dynamic Theme Discovery](./TDR-003-DYNAMIC-THEME-DISCOVERY.md)
