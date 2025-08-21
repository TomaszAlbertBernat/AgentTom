# Documentation Guidelines

Simple guidelines for writing clear, consistent documentation in the AgentTom project.

## 🎯 Core Principles

1. **Document as you code** - Write docs with your changes, not after
2. **Write for your reader** - Be clear and helpful  
3. **Keep it current** - Update docs when code changes
4. **Stay consistent** - Follow the same patterns throughout

## 🏗️ Document Structure

Every doc should have:

1. **Clear title** - What this document is about
2. **Brief description** - Who should read this and why
3. **Table of contents** - For longer docs (>200 lines)
4. **Main content** - Organized with clear headings
5. **Related links** - Connect to other relevant docs

### Template
```markdown
# Clear Document Title

Brief description of what this covers and who it's for.

## Main Section

Content with examples.

## 📚 Related Documentation
- [Link to related doc](path/to/doc.md)
```

## ✍️ Writing Guidelines

### Keep It Simple
- Use plain English
- Write short sentences  
- Avoid jargon
- Be specific, not vague

### Structure Your Content
- Start with an overview
- Use clear headings (max 4 levels)
- Put steps in numbered lists
- Group related info together
- Link to other docs instead of duplicating

### Make It Actionable
- Include working examples
- Provide step-by-step instructions
- Use real values, not placeholders

## 📝 Formatting

### Markdown Basics
```markdown
# Main Title (only one per doc)
## Section Title  
### Subsection Title

`inline code` for file names and commands

```bash
# Code blocks with language
bun install
```

- Bullet lists for items
1. Numbered lists for steps

[Link text](path/to/file.md)
```

### Emojis
Use these strategically:
- 🎯 Purpose/goals
- 🚀 Getting started  
- 🔧 Configuration
- 📋 Procedures
- ⚠️ Warnings
- 💡 Tips

## 📖 Content Types

### API Endpoints
```markdown
### Endpoint Name
**POST** `/api/endpoint` - What this does

**Request:**
```http
POST /api/endpoint
Authorization: Bearer token

{"field": "value"}
```

**Response:**
```json
{"success": true, "data": {}}
```
```

### Code Functions
```typescript
/**
 * Brief description of what this function does
 */
async function validateUser(credentials: LoginRequest) {
  // implementation
}
```

### Configuration
Use tables for environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection | Yes |
| `JWT_SECRET` | JWT signing key | Yes |

## 🔍 Quality Check

Before publishing, verify:
- [ ] Examples actually work
- [ ] Links aren't broken  
- [ ] Content is accurate
- [ ] Formatting is consistent
- [ ] Grammar and spelling are correct

## 🔄 Maintenance

### When to Update
- Code changes affect functionality
- New features are added
- Information becomes outdated
- Links break

### How to Update
1. Make minimal necessary changes
2. Test all examples  
3. Update related links
4. Keep the same structure

## 📋 Quick Reference

### New Document Checklist
1. Use the template format
2. Write a clear title and description  
3. Add working examples
4. Link to related docs
5. Review before publishing

### Removal Process
When removing docs:
1. Update all links that point to it
2. Remove from README/navigation
3. Archive if it has historical value

## ✅ Do's and Don'ts

### ✅ Do
- Document as you code
- Use simple language
- Include working examples  
- Keep docs updated
- Link to related content
- Test your examples

### ❌ Don't
- Write docs after coding
- Use unexplained jargon
- Include broken examples
- Let docs get outdated
- Duplicate information
- Skip the review

---

**Remember:** Good documentation grows with your code and helps real people solve real problems.
