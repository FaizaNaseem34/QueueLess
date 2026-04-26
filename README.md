# QueueLess 🚀

**QueueLess** is a modern, real-time queue management system designed to eliminate physical waiting lines and enhance the user experience for both service providers and customers. Built with the latest web technologies, it offers a seamless, role-based interface for managing and joining queues efficiently.

---

## 👨‍💻 Author
**Faiza Naseem**

---

## ✨ Key Features

### 🌟 Premium User Experience
- **Dynamic Splash Screen**: A high-end, 5-second animated entrance that intelligently routes users to their respective dashboards based on authentication status and roles.
- **Modern UI/UX**: Crafted with Ionic's premium components and custom glassmorphic styling for a state-of-the-art feel.

### 🛠️ Admin Dashboard (Service Provider)
- **Real-time Queue Creation**: Instantly set up queues with custom categories, descriptions, and average service times.
- **Live Monitoring**: Track active tokens, current serving numbers, and total waiting users in real-time.
- **Advanced Queue Control**: 
  - **Call Next**: Progress the queue with a single click.
  - **Counter Assignment**: Assign specific counters to serving tokens for better organization.
  - **Walk-in Support**: Manually add users who arrive without the app.
- **Dynamic QR Codes**: Automatically generates unique QR codes for every queue, allowing users to scan and join instantly.

### 📱 User Dashboard (Customer)
- **Queue Discovery**: Browse active queues in your organization or vicinity.
- **One-Tap Join**: Join a queue remotely or via QR scan.
- **Live Tracking**: Real-time updates on your position in line and estimated waiting time.
- **Delay Turn**: Request a position swap if you're running late (automatically swaps with the next person in line).
- **Queue History**: Track your past visits and completed sessions.

---

## 🚀 Technical Implementation

### 🏗️ Architecture
QueueLess follows a modular Angular architecture, leveraging **Ionic Framework** for the UI and **Firebase** for the backend.

- **Frontend**: Angular 20+, Ionic 8.0
- **Backend-as-a-Service**: Firebase (Firestore & Authentication)
- **Mobile Capabilities**: Capacitor 8.0+ for native performance on iOS and Android.

### ⚙️ Core Components
1. **QueueService**: The heart of the application, handling all Firestore interactions, real-time listeners (`onSnapshot`), and atomic updates (swapping token numbers for "Delay Turn").
2. **Role-Based Guarding**: Secure routing that ensures Admins and Users only access their permitted sections.
3. **QR Integration**: Uses `html5-qrcode` for scanning and `qrcode` for high-quality generation of entry points.

### 🛡️ Robustness
- **Field Validation**: Comprehensive validation across all forms (Login, Signup, Queue Creation) to ensure data integrity.
- **Real-time Synchronization**: Powered by Firestore, ensuring that as soon as an Admin calls the next token, the user's dashboard reflects the change instantly.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (Latest LTS)
- Ionic CLI (`npm install -g @ionic/cli`)

### Installation
1. **Clone the repository**:
   ```bash
   git clone [repository-url]
   cd QueueLess/queueless
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   ionic serve
   ```

---

## 📁 Project Structure
```text
src/app/
├── core/
│   └── services/       # Centralized Queue & Auth logic
├── features/
│   ├── admin/          # Admin dashboard & management
│   ├── auth/           # Login & Registration
│   ├── queue/          # QR scanning & Joining logic
│   ├── splash/         # 5-second animated splash
│   └── user/           # User dashboard & tracking
├── shared/             # Reusable UI components
└── layouts/            # Page structure templates
```

---

## 📜 License
This project is developed for educational and professional demonstration purposes. All rights reserved by the author.
