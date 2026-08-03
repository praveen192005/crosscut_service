# Brainy Blooms Stock Management System Backend

This is the backend API for the Brainy Blooms Uniform Stock Management System. Built using Node.js, Express, MongoDB Atlas, and Mongoose, this system handles robust inventory/product management operations.

---

## 🛠️ Features

- **MongoDB Atlas Integration**: Fully cloud-hosted or local database connectivity using Mongoose.
- **Robust Schema Validation**: Prevents negative stock levels, requires product codes (SKUs), and ensures SKU uniqueness.
- **Product CRUD**:
  - `POST` /api/products - Create a new product with stock details.
  - `GET` /api/products - List products with advanced searching (SKU, name, desc), exact filters (branch, gender, category), status filtration, and sorting/pagination.
  - `GET` /api/products/:id - Fetch details for a specific product.
  - `PUT` /api/products/:id - Update product specs or adjust stock levels (automatically recalculating totals).
  - `DELETE` /api/products/:id - Safely purge inventory records.
- **Inventory Analytics**:
  - `GET` /api/products/stats - Real-time calculations of total valuation, low-stock warnings, branch counts, and category breakdowns.

---

## 🚀 Getting Started

### 1. Installation
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and configure your credentials:
```env
PORT=5000
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<db-name>?retryWrites=true&w=majority
```
> **Note**: For local development, you can use a local MongoDB connection string: `mongodb://localhost:27017/stock_management`.

### 3. Running the Server
To run in **development mode** (utilizing `nodemon` for auto-reloading):
```bash
npm run dev
```

To run in **production mode**:
```bash
npm start
```

---

## 📬 API Specifications & Usage Examples

### 1. Create a Product
- **Endpoint**: `POST /api/products`
- **Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "name": "Yellow Uniform Top Boys Size 30",
    "sku": "YUNIF-TOP-BBLI-BOYS-30",
    "description": "Standard school logo yellow shirt for BBLI Boys",
    "category": "Yellow Uniform",
    "uniformPart": "Top",
    "branch": "BBLI",
    "gender": "Boys",
    "size": "30",
    "price": 450,
    "received": 60,
    "issued": 45,
    "minStockThreshold": 15
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Product created successfully",
    "data": {
      "_id": "60a8f9...",
      "name": "Yellow Uniform Top Boys Size 30",
      "sku": "YUNIF-TOP-BBLI-BOYS-30",
      "category": "Yellow Uniform",
      "uniformPart": "Top",
      "branch": "BBLI",
      "gender": "Boys",
      "size": "30",
      "price": 450,
      "received": 60,
      "issued": 45,
      "quantity": 15,
      "minStockThreshold": 15,
      "status": "Low Stock",
      "createdAt": "2026-07-08T08:15:00.000Z",
      "updatedAt": "2026-07-08T08:15:00.000Z"
    }
  }
  ```

### 2. Get Products (with Search & Filtering)
- **Endpoint**: `GET /api/products`
- **Query Parameters**:
  - `search` (Match name, description, or SKU)
  - `branch` (e.g. `BBLI`, `BBCS`, `BB MODERN`)
  - `category` (e.g. `Yellow Uniform`)
  - `status` (e.g. `In Stock`, `Low Stock`, `Out of Stock`)
  - `sortBy` (Field to sort, e.g. `price`, `quantity`)
  - `order` (`asc` or `desc`)
  - `page` (Page number)
  - `limit` (Items per page)
- **Example URL**: `/api/products?branch=BBLI&status=Low+Stock`

### 3. Get Stock Stats
- **Endpoint**: `GET /api/products/stats`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalProducts": 1,
      "totalStockItems": 15,
      "totalReceived": 60,
      "totalIssued": 45,
      "totalValuation": 6750,
      "outOfStockCount": 0,
      "lowStockCount": 1,
      "byCategory": [
        {
          "_id": "Yellow Uniform",
          "count": 1,
          "totalQuantity": 15
        }
      ],
      "byBranch": [
        {
          "_id": "BBLI",
          "count": 1,
          "totalQuantity": 15
        }
      ]
    }
  }
  ```

### 4. Update Product / Issue stock
- **Endpoint**: `PUT /api/products/:id`
- **Request Body (to record 2 new uniform issues)**:
  ```json
  {
    "issued": 47
  }
  ```
  *(The server will automatically recalculate quantity to `60 - 47 = 13` and transition status as needed)*
