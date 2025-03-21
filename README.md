# FASTDASH - Real-time Crypto Trading Dashboard

A modern, real-time cryptocurrency trading dashboard built with Next.js 13, featuring live price charts, order book depth visualization, and WebSocket integration with Binance's public API.

![Dashboard Preview](preview.png)

## Features

- 📊 Real-time candlestick charts with TradingView's lightweight-charts
- 📉 Live order book visualization
- 🔄 WebSocket integration with Binance
- 🎨 Modern, dark-themed UI
- ⚡ Efficient state management
- 📱 Responsive design

## Tech Stack

- **Framework**: Next.js 13 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: Shadcn/ui
- **Charts**: TradingView Lightweight Charts
- **WebSocket**: Binance API

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/0xletis/realtime-dashboard.git
cd realtime-dashboard
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                    # Next.js 13 app directory
├── components/            
│   ├── common/            # Reusable components
│   │   ├── header.tsx     # Application header
│   │   ├── controls.tsx   # Trading controls
│   │   ├── orderbook.tsx  # Order book component
│   │   └── tradechart.tsx # TradingView chart
│   └── ui/                # UI components from shadcn
├── services/
│   └── binanceWebSocket.ts # WebSocket service
└── types/                  # TypeScript type definitions
```

## Architecture & Design Decisions

### WebSocket Management
- Implemented a custom WebSocket hook for managing Binance connections
- Handles automatic reconnection and connection state management
- Separates real-time data concerns from UI components

### Component Structure
- Modular components for better maintainability
- Shared state management through props
- Clear separation of concerns between data fetching and presentation

### Styling Approach
- Used Tailwind CSS for rapid development and consistent design
- Custom dark theme optimized for trading interfaces
- Component-specific styles for better organization

### Approach & Trade-offs

My approach to building this real-time trading dashboard focused on creating a robust, reliable, and visually appealing trading interface:

1. **WebSocket Service Architecture**
   - Created a dedicated `binanceWebSocket` service to handle all API and WebSocket communications
   - Implemented comprehensive error handling for connection drops and data validation
   - Built connection management system that properly disconnects existing connections when switching pairs/timeframes
   - Added automatic reconnection logic with exponential backoff
   - Structured the service to handle multiple data streams (klines, orderbook) efficiently

2. **TradingView Chart Integration**
   - Customized lightweight-charts for a professional trading experience
   - Implemented dynamic volume bars with color adaptation
   - Added custom date/time formatting for different timeframes
   - Built price formatting logic that adapts to asset value ranges
   - Ensured chart stability during WebSocket disconnections or data gaps
   - Optimized performance for high-frequency updates

3. **Custom OrderBook Implementation**
   - Developed a custom order book visualization using shadcn/ui components
   - Implemented efficient update mechanism to handle high-frequency price changes
   - Created smooth animations for price updates while maintaining performance
   - Added depth visualization with dynamic scaling
   - Integrated error boundaries to prevent UI breaks during data issues

4. **UI/UX Design Decisions**
   - Selected a dark green theme optimized for extended trading sessions
   - Chose Inter font for optimal readability of numbers and text
   - Added visual feedback for connection status and data updates
   - Created consistent spacing and alignment across all components

5. **Error Handling & Edge Cases**
   - Implemented comprehensive error handling for failed WebSocket connections
   - Added fallback states for missing or invalid candlestick data
   - Created loading states that prevent UI jumps during data updates
   - Built validation for incoming data to prevent chart artifacts
   - Added retry mechanisms for failed connections with user feedback

The main trade-offs were:
- Chose custom WebSocket implementation over libraries for better control
- Used local state management instead of global state for simplicity
- Implemented custom order book visualization for specific styling needs
- Customizing TradingView's lightweight-charts for low value coins and web design
- Built modular components despite initial setup overhead

These decisions were made to prioritize reliability and user experience while maintaining clean, maintainable code.

## External Libraries

1. **@tradingview/lightweight-charts**
   - Purpose: Professional-grade financial charts
   - Version: ^4.1.1

2. **shadcn/ui**
   - Purpose: High-quality UI components
   - Components used: Select, Card, Button

3. **tailwindcss**
   - Purpose: Utility-first CSS framework
   - Version: ^3.3.0

4. **typescript**
   - Purpose: Static type checking
   - Version: ^5.0.0


## Acknowledgments

- Binance API for real-time market data
- TradingView for the lightweight-charts library
- Shadcn for the beautiful UI components
