#CROSS CUT ENTERPRICES


The system is split into two distinct portals to enforce role separation:
1. **Staff / Uniform Issuer Portal (`index.html`)**: Used by staff to search students, register student profiles, and issue uniform sets.
2. **Admin / Management Portal (`admin.html`)**: Used by management to check stock levels, add received stocks, review transaction logs, and resolve custom sizing exceptions.

Both portals connect to **Firebase Firestore** as the database and support a fallback local database mode using browser `localStorage` to allow immediate offline operations.

---

## ⚡ Quick Start & Login Credentials

You can launch and test all features of the application immediately without setting up Firebase:

1. Serve the project directory locally using a web server:
   ```bash
   # Using Python
   python3 -m http.server 8000
   
   # Or using Node
   npx serve .
   ```

2. **Access the Staff Portal (`index.html`)**:
   - Open: **[http://localhost:8000/index.html](http://localhost:8000/index.html)**
   - To log in, type any mobile phone number (e.g. `+91 98765 43210`) and click **Send OTP**.
   - Input the verification OTP code: **`123456`** and click **Verify**.
   - Search for students or click **Register New Student** to add new students. You can issue up to 3 uniform sets per student.
   - If a uniform size is out of stock, check the exception box to write a custom size/reason. This request is sent to the admin portal.

3. **Access the Admin Portal (`admin.html`)**:
   - On the Staff Login screen, you can click **Access Management Portal (Admin)** to switch screens, or navigate directly to **[http://localhost:8000/admin.html](http://localhost:8000/admin.html)**.
   - To log in, input the default password: **`admin123`** and click **Access Admin Dashboard**.
   - Check real-time stock levels, replenish stocks via "Add Received Stock", and view audit logs.
   - You can change this password at any time in the **Portal Settings** tab.
   - Click **Access Staff Portal** at the bottom of the login screen to navigate back.

---

## 📄 Sizing Ledger & PDF Exporting

### Stock Update Timestamps
The Active Uniform Sizing Ledger on the Admin Dashboard includes a **Last Updated** column. Every time stock is added (by admins) or issued (by staff), the timestamp is updated automatically.

### Exporting Stock Reports to PDF
1. Go to the Admin Dashboard.
2. In the **Active Uniform Sizing Ledger** card header, click the **📄 Export Stocks PDF** button.
3. A clean, high-contrast, print-friendly report page will open in a new browser tab.
4. The browser's native **Print** utility will trigger automatically. Select **Save as PDF** in the printer destination dropdown to download the report as a PDF file, or select a connected hardware printer to print it.
5. The report automatically respects the active branch filters selected in the top bar.

---

## 🔥 Firebase Production Setup

To connect the application to your live Firebase Cloud Project:

### Step 1: Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project** and name it (e.g., `brainy-blooms-stock`).

### Step 2: Enable Firebase Firestore
1. In the left navigation, click **Build** -> **Firestore Database** -> **Create Database** (start in Test Mode).
2. Click on the **Rules** tab, paste the following rules, and click **Publish**:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null || request.auth == null; 
       }
     }
   }
   ```

### Step 3: Enable Phone Authentication (For Staff Portal)
1. Click **Build** -> **Authentication** -> **Sign-in method** -> **Phone** -> **Enable**.
2. Add a phone number for testing under **Phone numbers for testing** (e.g., phone: `+919876543210`, OTP code: `111111`) and click **Save**.

### Step 4: Register Web App & Copy Config
1. Go to **Project Settings** (gear icon on the top-left sidebar).
2. Under the **General** tab, scroll down to **Your apps** and click the Web icon `</>`.
3. Register the web app and copy the config JSON.

### Step 5: Connect App to Firebase
1. Click **Setup Firebase Database Config** on the Login screen.
2. Paste the JSON and click **Connect**.
3. **Staff Login**: Log in with phone number OTP.
4. **Admin Login**: Log in with default password **`admin123`**. The app automatically creates the settings collection. Update your password in **Portal Settings**.
