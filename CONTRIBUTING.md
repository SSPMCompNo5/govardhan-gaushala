# 🤝 Contributing to Govardhan Goshala

Thank you for your interest in contributing to the Govardhan Goshala Management System! We welcome contributions from the community and appreciate your help in making this project better.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Guidelines](#contributing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [your-email@example.com](mailto:your-email@example.com).

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- Docker Desktop
- Git
- A code editor (VS Code recommended)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/yourusername/govardhan-goshala.git
   cd govardhan-goshala
   ```
3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/originalowner/govardhan-goshala.git
   ```

## 🛠️ Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
```bash
# Copy the environment template
cp env.friend.example .env.local

# Edit with your settings
# At minimum, change JWT_SECRET and NEXTAUTH_SECRET
```

### 3. Start Development Environment
```bash
# Start all services with Docker
npm run docker:up

# Or start development server only
npm run dev
```

### 4. Verify Setup
```bash
# Run setup validation
npm run setup:validate

# Check if everything is working
# Visit http://localhost:3000
```

## 📝 Contributing Guidelines

### Types of Contributions

We welcome several types of contributions:

- 🐛 **Bug Fixes**: Fix issues and improve stability
- ✨ **New Features**: Add new functionality
- 📚 **Documentation**: Improve docs and guides
- 🎨 **UI/UX Improvements**: Enhance user experience
- ⚡ **Performance**: Optimize speed and efficiency
- 🧪 **Tests**: Add or improve test coverage
- 🔧 **DevOps**: Improve deployment and CI/CD

### Before You Start

1. **Check existing issues** to see if your contribution is already being worked on
2. **Create an issue** for significant changes to discuss the approach
3. **Fork the repository** and create a feature branch
4. **Follow our coding standards** (see below)

## 🔄 Pull Request Process

### 1. Create a Feature Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-number
```

### 2. Make Your Changes
- Write clean, readable code
- Follow existing code patterns
- Add tests for new functionality
- Update documentation as needed

### 3. Test Your Changes
```bash
# Run linting
npm run lint

# Run tests
npm run test

# Build the application
npm run build

# Test with Docker
npm run docker:up
```

### 4. Commit Your Changes
```bash
git add .
git commit -m "feat: add new feature description"
```

Use conventional commit messages:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### 5. Push and Create PR
```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub with:
- Clear title and description
- Reference related issues
- Screenshots for UI changes
- Testing instructions

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check the documentation** and troubleshooting guides
3. **Try the latest version** to ensure it's not already fixed

### Issue Templates

We provide templates for:
- 🐛 **Bug Reports**: For reporting issues
- ✨ **Feature Requests**: For suggesting new features
- 🆘 **Setup Help**: For installation/setup issues

### Good Issue Description

Include:
- Clear title
- Detailed description
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- Environment details
- Screenshots/logs if relevant

## 💻 Coding Standards

### General Guidelines

- **Use TypeScript** for type safety
- **Follow ESLint rules** (run `npm run lint`)
- **Use Prettier** for code formatting
- **Write meaningful variable names**
- **Add comments** for complex logic
- **Keep functions small** and focused

### File Structure

```
app/
├── api/                 # API routes
├── dashboard/          # Dashboard pages
└── layout.js          # Root layout

components/
├── ui/                # Reusable UI components
├── dashboard/         # Dashboard-specific components
└── layouts/           # Layout components

lib/
├── models/            # Database models
├── utils/             # Utility functions
└── schemas/           # Validation schemas
```

### Naming Conventions

- **Files**: kebab-case (`user-profile.js`)
- **Components**: PascalCase (`UserProfile.jsx`)
- **Functions**: camelCase (`getUserProfile`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Database**: camelCase (`userProfiles`)

### Code Style

```javascript
// ✅ Good
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
};

// ❌ Bad
const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  return user;
};
```

## 🧪 Testing

### Running Tests
```bash
# Run all tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Writing Tests

- **Unit tests** for individual functions
- **Integration tests** for API endpoints
- **Component tests** for React components
- **E2E tests** for critical user flows

### Test Structure
```javascript
describe('UserService', () => {
  describe('getUserProfile', () => {
    it('should return user profile for valid ID', async () => {
      // Arrange
      const userId = 'valid-id';
      
      // Act
      const result = await getUserProfile(userId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });
  });
});
```

## 📚 Documentation

### Documentation Standards

- **Keep docs up-to-date** with code changes
- **Use clear, simple language**
- **Include code examples**
- **Add screenshots** for UI changes
- **Update README** for new features

### Documentation Types

- **README.md**: Project overview and quick start
- **API Documentation**: Endpoint descriptions
- **Component Documentation**: Props and usage
- **Setup Guides**: Installation instructions
- **Troubleshooting**: Common issues and solutions

## 🏷️ Labels and Milestones

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issues
- `priority: low`: Low priority issues

### Pull Request Labels
- `ready for review`: Ready for maintainer review
- `needs testing`: Requires testing
- `breaking change`: Breaking change
- `dependencies`: Dependency updates

## 🎯 Development Workflow

### 1. Planning
- Create issue for significant changes
- Discuss approach with maintainers
- Break down large features into smaller tasks

### 2. Development
- Create feature branch
- Write code following standards
- Add tests for new functionality
- Update documentation

### 3. Testing
- Run all tests locally
- Test manually in different browsers
- Verify Docker setup works

### 4. Review
- Create pull request
- Address review feedback
- Ensure CI passes

### 5. Merge
- Squash commits if needed
- Delete feature branch
- Update related issues

## 🆘 Getting Help

### Resources
- **Documentation**: Check the `/docs` folder
- **Issues**: Search existing GitHub issues
- **Discussions**: Use GitHub Discussions for questions
- **Code Review**: Ask for help in pull requests

### Contact
- **Email**: [your-email@example.com](mailto:your-email@example.com)
- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussion

## 🎉 Recognition

Contributors will be recognized in:
- **README.md** contributors section
- **Release notes** for significant contributions
- **GitHub contributors** page

## 📄 License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

**Thank you for contributing to Govardhan Goshala! 🐄✨**

*Your contributions help make goshala management more efficient and accessible to everyone.*
