# AI Content Generation System

This directory contains the complete AI-powered content generation system for the Korean Reddit-style community platform. The system enables fully automated community management with minimal human intervention.

## Overview

The AI content generation system consists of three main components:

1. **Seed Content Generation** - Automatically creates daily posts based on trending news
2. **AI Interaction System** - Generates engagement comments and post summaries
3. **Trend Analysis & Channel Management** - Analyzes trends and creates new channels

## Components

### 1. Seed Content Generation (`seed-content.ts`)

Automatically generates high-quality seed posts to maintain community activity.

**Features:**
- Fetches trending news from multiple sources
- Generates channel-specific content
- Quality validation and confidence scoring
- Automated publishing with moderation

**API Endpoints:**
- `POST /api/ai/seed-content` - Generate and publish seed posts
- `GET /api/ai/seed-content` - Retrieve AI-generated posts
- `DELETE /api/ai/seed-content` - Clean up old posts

**Usage:**
```typescript
import { generateDailySeedPosts, publishSeedPosts } from '@/lib/ai/seed-content';

// Generate 10 seed posts
const seedPosts = await generateDailySeedPosts(10);

// Publish high-quality posts
const qualityPosts = seedPosts.filter(post => post.confidence > 70);
const result = await publishSeedPosts(qualityPosts);
```

### 2. AI Interaction System (`interaction.ts`)

Enhances user engagement through automated comments and content summaries.

**Features:**
- Discussion-promoting comments for inactive posts
- 3-line summaries for long posts
- Content translation and cultural adaptation
- Engagement analytics and optimization

**API Endpoints:**
- `POST /api/ai/interaction` - Generate comments, summaries, translations
- `GET /api/ai/interaction` - Find posts needing engagement

**Usage:**
```typescript
import { generateEngagementComment, generatePostSummary } from '@/lib/ai/interaction';

// Generate engagement comment
const comment = await generateEngagementComment(
  postId,
  postTitle,
  postContent,
  postId,
  postTitle,
  postContent,
  channelTheme,
  existingComments
  existingComments
);

// Generate post summary
const summary = await generatePostSummary(postId, title, content);
```

### 3. Trend Analysis & Channel Management (`trends.ts`)

Analyzes community trends and automatically creates relevant channels.

**Features:**
- Real-time trend analysis from post data
- AI-powered channel suggestions
- Automatic channel creation for high-interest topics
- Cross-post recommendations

**API Endpoints:**
- `POST /api/ai/trends` - Analyze trends, create channels
- `GET /api/ai/trends` - Retrieve trending topics

**Usage:**
```typescript
import { analyzeRealTimeTrends, generateSubredditSuggestions } from '@/lib/ai/trends';

// Analyze trends
const trends = await analyzeRealTimeTrends('24h');

// Generate channel suggestions
const suggestions = await generateChannelSuggestions(trends);
```

### 4. Task Scheduler (`scheduler.ts`)

Orchestrates all AI tasks on automated schedules.

**Scheduled Tasks:**
- **9 AM KST**: Daily seed content generation
- **6 PM KST**: Evening engagement boost
- **Every 4 hours**: Engagement comments and summaries
- **Twice daily**: Trend analysis and channel creation
- **Midnight**: Content cleanup

**API Endpoints:**
- `POST /api/ai/scheduler` - Run specific tasks
- `GET /api/ai/scheduler` - Get task execution history

## Configuration

### Environment Variables

```bash
# AI Services
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Configuration
AI_MODERATION_CONFIDENCE_THRESHOLD=95
```

### AI Model Configuration

The system uses multiple AI providers for redundancy:

- **OpenAI GPT-4**: Primary content generation and moderation
- **Anthropic Claude**: Complex analysis and summaries
- **Fallback**: Rule-based systems when AI services fail

## Quality Assurance

### Content Validation

All AI-generated content goes through multiple validation layers:

1. **Confidence Scoring**: Only content with >70% confidence is published
2. **Content Length**: Minimum and maximum length requirements
3. **Engagement Potential**: Checks for discussion-promoting elements
4. **Cultural Appropriateness**: Korean language and cultural context validation

### Human-in-the-Loop

- AI decisions with <95% confidence require human review
- All moderation actions are logged for transparency
- Manual override capabilities for all automated decisions

## Performance Optimization

### Caching Strategy

- Trending topics cached for 1 hour
- Channel data cached for 24 hours
- AI responses cached based on content hash

### Rate Limiting

- OpenAI: 60 requests per minute
- Anthropic: 50 requests per minute
- Automatic fallback to secondary providers

### Cost Management

- Circuit breaker pattern for expensive operations
- Batch processing for multiple requests
- Automatic cost monitoring and alerts

## Monitoring and Analytics

### Key Metrics

- **Content Quality**: User engagement with AI-generated posts
- **System Performance**: API response times and success rates
- **Cost Efficiency**: AI API costs per user engagement
- **Community Growth**: New channels created and adoption rates

### Logging

All AI operations are logged with:
- Request/response data
- Confidence scores
- Execution time
- Error details
- User impact metrics

## Testing

### Unit Tests

```bash
npm run test src/lib/ai/__tests__/
```

### Integration Tests

```bash
npm run test:e2e -- --grep "AI Content Generation"
```

### Load Testing

```bash
# Test AI service capacity
npm run test:load -- --target ai-content-generation
```

## Deployment

### Production Checklist

- [ ] Environment variables configured
- [ ] AI API keys with sufficient quotas
- [ ] Database migrations applied
- [ ] Monitoring dashboards configured
- [ ] Error alerting enabled
- [ ] Cost monitoring active

### Scaling Considerations

- **Horizontal Scaling**: Multiple Vercel functions handle concurrent requests
- **Database Scaling**: Supabase auto-scales based on usage
- **AI Service Limits**: Multiple provider accounts for higher quotas

## Troubleshooting

### Common Issues

1. **AI Service Timeouts**
   - Check API key quotas
   - Verify network connectivity
   - Review rate limiting settings

2. **Low Content Quality**
   - Adjust confidence thresholds
   - Review prompt engineering
   - Check training data relevance

3. **High Costs**
   - Enable cost monitoring alerts
   - Optimize prompt lengths
   - Implement more aggressive caching

### Debug Mode

Enable debug logging:

```bash
DEBUG=ai:* npm run dev
```

## Contributing

### Adding New AI Features

1. Create feature module in `/src/lib/ai/`
2. Add API endpoints in `/src/app/api/ai/`
3. Update scheduler if needed
4. Add comprehensive tests
5. Update documentation

### Prompt Engineering Guidelines

- Use clear, specific instructions
- Include Korean cultural context
- Specify output format (JSON preferred)
- Include confidence scoring
- Test with edge cases

## Legal and Compliance

### Data Privacy

- No personal information stored in AI requests
- All user data hashed before processing
- 3-month automatic log deletion
- GDPR/CCPA compliance maintained

### Content Moderation

- All AI-generated content pre-moderated
- Human review for sensitive topics
- Transparent moderation logging
- Appeal process for automated decisions

## Future Enhancements

### Planned Features

- [ ] Multi-language support beyond Korean/English
- [ ] Advanced sentiment analysis
- [ ] Personalized content recommendations
- [ ] Voice-to-text content generation
- [ ] Image-based post generation

### Research Areas

- Fine-tuning models on Korean community data
- Improved cultural context understanding
- Real-time trend prediction
- Advanced spam detection
- Community health metrics

## Support

For technical support or questions:

- Create an issue in the project repository
- Check the troubleshooting guide above
- Review API documentation
- Contact the development team

---

*This AI content generation system is designed to scale from hundreds to hundreds of thousands of users while maintaining high content quality and community engagement.*