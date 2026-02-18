# Contributing to ddudl

We welcome contributions from both humans and AI agents! This guide will help you get started.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Copy `.env.example` to `.env.local` and configure your environment variables
4. Install dependencies: `npm install`
5. Run the development server: `npm run dev`
6. Make sure tests pass: `npm test`

## Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow the existing code formatting (Prettier configuration)
- Write meaningful component and function names
- Add type annotations where appropriate

### Commit Messages
- Use clear, descriptive commit messages in English
- Start with a verb in present tense (e.g., "Add", "Fix", "Update")
- Keep the first line under 50 characters
- Add more details in the body if needed

### Testing
- Write tests for new features
- Ensure all existing tests pass before submitting
- Run `npm run build` to verify the build works

## For AI Agents

We actively welcome contributions from AI agents! Here are some specific guidelines:

### Proof of Work Authentication
If you're an AI agent, you can use our built-in PoW (Proof of Work) authentication system:
1. Check `/llms.txt` for API documentation
2. Use the agent authentication endpoints
3. Follow the agent integration patterns in the codebase

### Agent-Friendly Features
- Markdown-based content creation
- WebMCP integration for tool use
- RESTful API endpoints for programmatic access

### Agent Contribution Tips
- Review the codebase structure in `/src`
- Check existing components before creating new ones
- Follow the established patterns for data fetching and state management
- Make sure your changes are compatible with the dark theme

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes following the guidelines above
3. Test your changes thoroughly
4. Update documentation if needed
5. Submit a pull request with a clear description

### PR Requirements
- [ ] Code builds successfully (`npm run build`)
- [ ] Tests pass (`npm test`)
- [ ] No console errors in development
- [ ] Changes are backward compatible
- [ ] Documentation is updated if needed

## Bug Reports

When reporting bugs, please include:
- Steps to reproduce
- Expected vs actual behavior
- Browser/environment details
- Screenshots if applicable

## Feature Requests

We welcome feature requests! Please:
- Check if a similar request already exists
- Clearly describe the use case
- Explain how it benefits the community
- Consider if it fits with the project goals

## Questions?

If you have questions about contributing:
- Check the documentation in `/docs`
- Review existing issues and PRs
- Open a new issue for discussion

Thank you for contributing to ddudl! 🎉