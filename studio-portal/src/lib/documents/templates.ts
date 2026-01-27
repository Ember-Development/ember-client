import { DocumentType } from ".prisma/client";

export interface DocumentTemplate {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  content: string;
}

interface TemplateContext {
  projectName: string;
  clientName: string;
  startDate?: string;
  targetLaunchDate?: string;
  description?: string;
  phase?: string;
  status?: string;
}

function renderTemplate(template: string, context: TemplateContext): string {
  let rendered = template;
  rendered = rendered.replace(/\{\{projectName\}\}/g, context.projectName || "");
  rendered = rendered.replace(/\{\{clientName\}\}/g, context.clientName || "");
  rendered = rendered.replace(/\{\{startDate\}\}/g, context.startDate || "TBD");
  rendered = rendered.replace(/\{\{targetLaunchDate\}\}/g, context.targetLaunchDate || "TBD");
  rendered = rendered.replace(/\{\{description\}\}/g, context.description || "");
  rendered = rendered.replace(/\{\{phase\}\}/g, context.phase || "");
  rendered = rendered.replace(/\{\{status\}\}/g, context.status || "");
  return rendered;
}

export const documentTemplates: DocumentTemplate[] = [
  {
    id: "scope-template",
    type: "SCOPE",
    name: "Project Scope Document",
    description: "Define project objectives, deliverables, and timeline",
    content: `# {{projectName}} - Scope Document

## Project Overview
**Client:** {{clientName}}  
**Start Date:** {{startDate}}  
**Target Launch:** {{targetLaunchDate}}  
**Current Phase:** {{phase}}  
**Status:** {{status}}

{{description}}

## Objectives
[Define the primary goals and objectives of this project]

## Deliverables
[List all key deliverables and their descriptions]

### Deliverable 1
- Description: [To be filled]
- Acceptance Criteria: [To be filled]

### Deliverable 2
- Description: [To be filled]
- Acceptance Criteria: [To be filled]

## Timeline
[Outline the project timeline with key milestones]

## Out of Scope
[Clearly define what is NOT included in this project]

## Assumptions
[List any assumptions made during scope definition]

## Risks
[Identify potential risks and mitigation strategies]`,
  },
  {
    id: "sow-template",
    type: "SOW",
    name: "Statement of Work",
    description: "Formal agreement document outlining work to be performed",
    content: `# Statement of Work - {{projectName}}

## Parties
**Client:** {{clientName}}  
**Project:** {{projectName}}  
**Effective Date:** {{startDate}}

## Project Description
{{description}}

## Scope of Work
[Detailed description of work to be performed]

## Deliverables
[List all deliverables with acceptance criteria]

## Timeline
[Project timeline with key milestones and dates]

## Payment Terms
[Payment schedule and terms]

## Change Management
[Process for handling scope changes]

## Acceptance Criteria
[How deliverables will be accepted]

## Terms and Conditions
[Standard terms and conditions]`,
  },
  {
    id: "architecture-template",
    type: "ARCHITECTURE",
    name: "Architecture Document",
    description: "Technical architecture and system design documentation",
    content: `graph TD
    subgraph "Frontend"
        A[Web Application]
        B[Mobile App]
    end
    subgraph "API Layer"
        C[API Gateway]
        D[Auth Service]
        E[Business Logic]
    end
    subgraph "Data Layer"
        F[(PostgreSQL)]
        G[(Redis Cache)]
    end
    A --> C
    B --> C
    C --> D
    C --> E
    E --> F
    E --> G`,
  },
  {
    id: "design-template",
    type: "DESIGN",
    name: "Design Document",
    description: "UI/UX design specifications and guidelines",
    content: `# {{projectName}} - Design Document

## Project Overview
**Project:** {{projectName}}  
**Client:** {{clientName}}  
**Design Phase:** {{phase}}

## Design Principles
[Core design principles and philosophy]

## Brand Guidelines
[Brand colors, typography, and style guide]

## User Experience

### User Flows
[Key user journeys and flows]

### Wireframes
[Link to wireframes or describe structure]

## Visual Design

### Color Palette
[Primary and secondary colors]

### Typography
[Font families and hierarchy]

### Components
[Reusable UI components]

## Responsive Design
[Breakpoints and mobile considerations]

## Accessibility
[Accessibility standards and considerations]

## Design Assets
[Links to design files and resources]`,
  },
  {
    id: "api-template",
    type: "API",
    name: "API Documentation",
    description: "API endpoints, schemas, and integration guide",
    content: `# {{projectName}} - API Documentation

## Overview
**Project:** {{projectName}}  
**Base URL:** [API base URL]  
**Version:** [API version]

## Authentication
[Authentication method and requirements]

## Endpoints

### Endpoint 1
\`\`\`
GET /api/endpoint1
\`\`\`

**Description:** [Endpoint description]

**Parameters:**
- \`param1\` (string, required): [Description]
- \`param2\` (number, optional): [Description]

**Response:**
\`\`\`json
{
  "field1": "value",
  "field2": 123
}
\`\`\`

### Endpoint 2
\`\`\`
POST /api/endpoint2
\`\`\`

**Description:** [Endpoint description]

**Request Body:**
\`\`\`json
{
  "field1": "value"
}
\`\`\`

**Response:**
\`\`\`json
{
  "success": true
}
\`\`\`

## Data Models
[Schema definitions]

## Error Handling
[Error codes and responses]

## Rate Limiting
[Rate limiting policies]

## Examples
[Code examples and use cases]`,
  },
  {
    id: "launch-checklist-template",
    type: "LAUNCH_CHECKLIST",
    name: "Launch Checklist",
    description: "Pre-launch checklist and launch procedures",
    content: `# {{projectName}} - Launch Checklist

## Pre-Launch Checklist

### Development
- [ ] All features completed and tested
- [ ] Code review completed
- [ ] Performance testing passed
- [ ] Security audit completed
- [ ] Documentation updated

### Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Browser compatibility tested
- [ ] Mobile responsiveness verified

### Infrastructure
- [ ] Production environment configured
- [ ] Database migrations applied
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring set up
- [ ] Backup strategy in place

### Content
- [ ] All content reviewed and approved
- [ ] Images optimized
- [ ] SEO metadata configured
- [ ] Analytics tracking implemented

### Launch Day
- [ ] Final smoke tests completed
- [ ] Team briefed and on standby
- [ ] Rollback plan ready
- [ ] Communication plan executed

## Post-Launch
- [ ] Monitor error rates
- [ ] Check analytics
- [ ] Gather user feedback
- [ ] Document issues
- [ ] Plan hotfixes if needed

## Launch Date
**Target:** {{targetLaunchDate}}  
**Actual:** [To be filled]`,
  },
  {
    id: "note-template",
    type: "NOTE",
    name: "Project Note",
    description: "Quick notes and important information for the project",
    content: `# {{projectName}} - Project Notes

## Important Information
[Add important notes, decisions, or reminders here]

## Meeting Notes
[Document key points from meetings]

## Decisions
[Record important decisions made]

## Reminders
[Things to remember]

## Links & Resources
[Important links and resources]

---
*Last updated: [Date]*
`,
  },
  {
    id: "database-erd-template",
    type: "DATABASE_ERD",
    name: "Database ERD",
    description: "Entity Relationship Diagram for database schema design",
    content: JSON.stringify({
      nodes: [
        {
          id: "1",
          type: "entity",
          position: { x: 100, y: 100 },
          data: {
            tableName: "users",
            attributes: ["id", "email", "name", "created_at", "updated_at"],
          },
        },
        {
          id: "2",
          type: "entity",
          position: { x: 400, y: 100 },
          data: {
            tableName: "posts",
            attributes: ["id", "user_id", "title", "content", "created_at", "updated_at"],
          },
        },
      ],
      edges: [
        {
          id: "e1-2",
          source: "1",
          target: "2",
          label: "1:N",
          labelStyle: { fill: "#374151", fontWeight: 600 },
          style: { stroke: "#64748b", strokeWidth: 2 },
          markerEnd: {
            type: "arrowclosed",
            color: "#64748b",
          },
        },
      ],
    }, null, 2),
  },
];

export function getTemplateById(id: string): DocumentTemplate | undefined {
  return documentTemplates.find((t) => t.id === id);
}

export function getTemplatesByType(type: DocumentType): DocumentTemplate[] {
  return documentTemplates.filter((t) => t.type === type);
}

export function renderDocumentTemplate(
  templateId: string,
  context: TemplateContext
): string {
  const template = getTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  return renderTemplate(template.content, context);
}

