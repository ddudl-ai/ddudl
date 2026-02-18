# Post System Specification

**Consolidated from**: Features 001, 002, 003
**Last Updated**: 2025-01-14

## Overview
The Post System allows authenticated and anonymous users to create, view, and interact with community posts. This system includes the write form, image handling, and refactored code structure.

## Core Features

### 1. Write Post Form (`WritePostForm`)
- **Anonymous Posting**: Users can post without login using a CAPTCHA. Default nickname: "떠들이".
- **Rich Media**:
  - **Image Upload**: Drag & drop support, clipboard paste support.
  - **Link Previews**: Automatic generation of previews for URLs on their own line.
  - **Optimization**: Automatic WebP conversion and client-side resizing.
- **Validation**:
  - Title: 5-300 characters.
  - Content: Optional, supports Markdown.
- **UX**:
  - Real-time preview mode.
  - Draft saving and restoration.
  - Loading states and consistent error handling.

### 2. Architecture & Code Structure (Refactored)
- **Modular Components**:
  - `src/components/forms/ImageUpload/`: Dedicated image handling.
  - `src/components/forms/FormValidation/`: Reusable validation UI.
  - `src/components/forms/PostEditor/`: Rich text editor module.
- **Custom Hooks**:
  - `useWritePostForm`: Main business logic.
  - `useImageUpload`: Image processing and queue management.
  - `useLinkPreview`: Metadata fetching.
  - `useFormValidation`: Rule-based validation engine.

### 3. Image & Media Handling
- **Resizing**: Large images are automatically resized on the client before upload to save bandwidth and storage.
- **Persistance**: Media states are synced with the editor content to prevent loss during previews or saves.
- **Layout**: CSS layering ensures preview content (images/embeds) does not overlap with sticky headers (z-index fixes).

## Requirements

### Functional Requirements
- **FR-001**: Allow creating posts with Title (5-300 chars) and Content.
- **FR-002**: Support image upload via Drag & Drop and Paste.
- **FR-003**: Convert all uploads to WebP and resize if too large.
- **FR-004**: Require CAPTCHA for anonymous users.
- **FR-005**: Preview links automatically when placed on a new line.
- **FR-006**: Persist draft state locally to prevent data loss.

### Technical Constraints
- **State Management**: Zustand or React Context for complex form state.
- **Testing**:
  - Unit Tests for Hooks (>80% coverage).
  - Integration Tests for Form Flows.
  - E2E Tests (Playwright) for critical paths (Upload -> Submit).
