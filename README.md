# Real-time Video Chat Application

## Overview

A cutting-edge real-time video chat application built to explore WebRTC, real-time communication technologies, and advanced React development techniques.

## Key Features

- **Real-time Communication**:
  - Instant messaging (one-on-one and group chats)
  - Video calling using WebRTC
  - Audio and video messaging
- **Media Sharing**:
  - Image sharing
  - Video uploads
  - File and audio message support
- **Performance Optimizations**:
  - Lazy loading
  - Virtual scrolling
- **Secure Authentication**

## Tech Stack

![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=for-the-badge&logo=webrtc&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

### Core Technologies

- **Frontend**: React, TypeScript, Vite
- **UI**: shadcn/ui
- **Real-time Database**: Firebase Firestore
- **Authentication**: Firebase Authentication
- **Media Storage**: Cloudinary
- **Communication**: WebRTC
- **Performance**: Lazy loading, Virtual scrolling

## Unique Technical Implementations

- Real-time messaging system
- WebRTC-powered video calling
- Secure media sharing
- Optimized performance techniques
- Cross-platform messaging capabilities

## Prerequisites

- Node.js (v18.0.0+)
- npm (v9.0.0+)

## Installation

1. Clone the repository

```bash
git clone https://github.com/tsthuy/video_chat_app.git
```

2. Navigate to project directory

```bash
cd video_chat_app
```

3. Install dependencies

```bash
npm install
```

## Available Scripts

| Command                | Description              |
| ---------------------- | ------------------------ |
| `npm run dev`          | Start development server |
| `npm run build`        | Build for production     |
| `npm run lint`         | Run ESLint               |
| `npm run preview`      | Preview production build |
| `npm run lint:fix`     | Fix ESLint issues        |
| `npm run prettier`     | Check code formatting    |
| `npm run prettier:fix` | Fix code formatting      |

## Environment Configuration

The project uses `cross-env` and `yenv` for environment management:

- Supports multiple environments (development, production)
- Automatically generates `.env` files
- Secure environment variable handling

## Key Technical Highlights

- **WebRTC Integration**:

  - Peer-to-peer video and audio communication
  - Low-latency real-time connections

- **Firebase Integration**:

  - Real-time database for instant messaging
  - Secure user authentication
  - Cloud firestore for data management

- **Performance Optimization**:
  - Lazy loading of components and resources
  - Virtual scrolling for efficient list rendering
  - Minimized re-renders with React optimization techniques

## Security Features

- Firebase Authentication
- Secure media uploads via Cloudinary
- Real-time connection encryption
- Protected routes and user data

## Responsive Design

- Fully responsive interface
- Adaptive layout for various device sizes
- Mobile and desktop compatible
