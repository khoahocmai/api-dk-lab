# API Lab (Api DK Lab)

<div align="center">

![API DK Lab Logo](public/icon.png)

**Desktop API Client for REST & GraphQL — Tối ưu, Siêu nhẹ, Hoạt động Cục bộ 100%**

[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue?style=flat-square)](https://github.com/khoahocmai/api-dk-lab)
[![Electron](https://img.shields.io/badge/Electron-30.0.1-47848F?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.1.6-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-OneDark%20Theme-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)](LICENSE)

[Tính Năng Nổi Bật](#-tính-năng-nổi-bật-key-features) • [Yêu Cầu & Cài Đặt](#-yêu-cầu-hệ-thống--cài-đặt-installation--setup) • [Hướng Dẫn Sử Dụng](#-hướng-dẫn-sử-dụng-chi-tiết-step-by-step-user-guide) • [Cấu Trúc Dự Án](#-cấu-trúc-thư-mục-dự-án-project-structure) • [Phím Tắt](#-bảng-phím-tắt-tiện-dụng-keyboard-shortcuts)

</div>

---

## 📖 Giới Thiệu Tổng Quan (Overview)

**API Lab (Api DK Lab)** là một giải pháp môi trường làm việc Desktop API Client thế hệ mới, gọn nhẹ và có hiệu năng vượt trội, dành riêng cho các kỹ sư phần mềm kiểm thử và phát triển các dịch vụ **RESTful Web APIs** và **GraphQL Services**.

Được xây dựng trên nền tảng **Native Desktop** kết hợp sức mạnh của **Electron**, **React 18**, **TypeScript**, **Vite** và **Tailwind CSS**, API Lab giải quyết triệt để sự nặng nề, khởi động chậm chạp cũng như các phiền toái về chính sách lưu trữ đám mây của các phần mềm truyền thống.

### 🌟 Điểm Khác Biệt & Giá Trị Cốt Lõi

* ⚡ **Bypass 100% Rào Cản CORS:**  
  Không giống như các Web-based Client bị giới hạn bởi chính sách bảo mật trình duyệt (*Same-Origin Policy*), toàn bộ các HTTP/HTTPS Request từ API Lab đều được điều hướng trực tiếp qua cơ chế **IPC (Inter-Process Communication)** và thực thi ở tầng **Node.js Main Process**. Bạn có thể kiểm thử bất kỳ domain nội bộ, localhost hay dịch vụ bên thứ ba mà không cần cài thêm extension trình duyệt hay tắt bảo mật CORS.

* 🔒 **Local-First & Hoạt Động Hoàn Toàn Offline (100% Offline):**  
  Toàn bộ dữ liệu của bạn gồm: Collections, Folders, Requests, Environments, Data Presets và History đều được lưu trực tiếp dưới dạng các tệp JSON có cấu trúc trong thư mục `data/` trên máy tính cục bộ. API Lab **nói không với việc bắt buộc đăng nhập tài khoản đám mây**, không thu thập dữ liệu nhạy cảm hay API Keys của bạn.

* 🚀 **Tối Ưu Sâu Cho GraphQL (First-Class GraphQL Suite):**  
  Khắc phục nhược điểm thao tác rườm rà của các công cụ thông thường (vốn chỉ xem GraphQL như một POST raw string), API Lab tích hợp sẵn **GraphQL Schema Introspection Engine**, cây **GraphQL Explorer trực quan**, và khả năng **đồng bộ hai chiều (Bi-directional Reverse Sync) thời gian thực** giữa Query AST và Variables Editor.

* 🛠️ **Tối Ưu Cho Debugger & Developer Experience:**  
  Hỗ trợ cấu hình `timeout = 0` (không giới hạn thời gian chờ) giúp backend developer thoải mái đặt breakpoint trong mã nguồn server mà không bị timeout request; tự động làm sạch dấu phẩy thừa (*trailing commas RFC 8259*) trong JSON; tự động nhận diện Path Variables `:param`.

---

## ⚡ Tính Năng Nổi Bật (Key Features)

### 🌐 1. REST Client Đầy Đủ & Linh Hoạt
* **Hỗ trợ toàn diện các HTTP Method:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS` với màu sắc nhận diện trực quan theo chuẩn quốc tế.
* **Bảng Key-Value thông minh:** Hỗ trợ nhập Query Parameters, Headers, Form-Data và URL-Encoded với tính năng tự động tick chọn và tự động tạo hàng mới ngay khi người dùng gõ phím.
* **Path Variables tự động (`:param`):** Khi URL chứa các tham số dạng `:orderId`, `:userId`, hệ thống tự động bóc tách thành bảng cấu hình riêng biệt, tô màu nổi bật trên thanh URL, hỗ trợ hover xem trước giá trị và tự động thay thế khi bấm gửi.
* **Định dạng Body đa dạng:**
  * **raw JSON:** Tích hợp bộ soạn thảo CodeMirror chuyên nghiệp với Dark Theme, tự động thụt lề (*Format JSON*), tự động phát hiện và loại bỏ dấu phẩy thừa (*trailing commas*) trước khi gửi.
  * **x-www-form-urlencoded:** Bảng cặp khóa - giá trị trực quan.
  * **multipart/form-data:** Hỗ trợ text field và file upload.
  * **raw text:** Soạn thảo văn bản thuần túy.

### 🔮 2. GraphQL Suite Chuyên Sâu
* **Nạp Schema Introspection độc lập:** Tự động gửi truy vấn nội quan tới server thông qua URL cấu hình trong Environment, trích xuất toàn bộ Query Fields, Mutation Fields, Sub-fields và Arguments.
* **Cây GraphQL Explorer trực quan:**
  * Lọc linh hoạt theo danh mục `DOCS`, `QUERY`, `MUTATION`.
  * Danh sách cuộn độc lập mượt mà, hỗ trợ tìm kiếm trường dữ liệu thời gian thực.
  * Thao tác chọn trường (fields) và đối số (arguments) tức thì sinh ra câu truy vấn chuẩn cú pháp AST.
* **Bố cục tích hợp chuẩn mực (Postman-style Layout):**
  * Khung soạn thảo Query ở phía trên.
  * Ngăn kéo **JSON Variables** collapsible ở đáy, có thể thu gọn/mở rộng chỉ với một cú nhấp chuột.
  * **Đồng bộ 2 chiều thời gian thực (Bi-directional Sync):** Khi sửa Query/Variables trong Editor, cây Explorer tự động cập nhật tick chọn tương ứng (với cơ chế debounce 300ms chống vòng lặp).
* **Mở Tab mới thông minh:** Click chọn API từ cây Explorer sẽ tự động mở tab mới nếu tab hiện tại đang có dữ liệu làm việc dở dang.

### 🌍 3. Quản Lý Môi Trường (Environments) & Template Engine
* **Cú pháp biến bản mẫu `{{variable}}`:** Cho phép dùng biến tại URL Bar, Query Params, Path Variables, Headers, Bearer Token và GraphQL Variables JSON.
* **Syntax Highlighting trực tiếp:** Tô màu chữ và in đậm riêng biệt cho các biến `{{...}}` ngay trên ô nhập liệu URL. Rê chuột (hover) để xem Popover hiển thị giá trị phân giải thực tế và môi trường đang áp dụng.
* **Chế độ bảo mật (Secret Mask):** Ẩn các giá trị nhạy cảm (JWT Token, Client Secret, API Key) dưới dạng ký tự chấm tròn `••••••••` và cung cấp nút bật/tắt hiển thị con mắt.
* **Cảnh báo Domain Mismatch Guard:** Tự động cảnh báo màu vàng khi người dùng gửi request tới một host khác với `{{Domain}}` của môi trường đang chọn, tránh rò rỉ token bảo mật sang domain lạ.
* **Chuyển đổi môi trường nhanh (Quick Switcher):** Dropdown tiện lợi ngay trên thanh Header Topbar.
* **Phím tắt thông minh Alt + Click:** Nhấn giữ phím `Alt` và click vào checkbox của một biến bất kỳ trong bảng để **kích hoạt duy nhất biến đó và tắt toàn bộ các biến còn lại** (Isolate Variable).

### 📦 4. Bộ Dữ Liệu Mẫu Đầu Vào (Variables & Body Presets)
* **Kiểm thử nhiều kịch bản không cần nhân bản Environment:** Cho phép lưu và đặt tên nhiều bộ dữ liệu mẫu (ví dụ: *Chi nhánh 1 - Bình thường*, *Chi nhánh 2 - Quá tải*, *Payload kịch bản lỗi*) gắn liền với từng Request cụ thể.
* **Chuyển đổi tức thì:** Chọn Preset từ dropdown để nạp ngay cấu trúc JSON vào Variables/Body mà không làm xáo trộn các biến toàn cục.

### 📋 5. cURL Parser & Generator Chuẩn Xác
* **Import cURL thông minh:** Bóc tách các câu lệnh cURL phức tạp (hỗ trợ cả ANSI-C quoting `$'...'`, escape Unicode, multi-line `\`), tự động nhận diện REST hay GraphQL để điền chính xác Method, URL, Headers, Auth Token và Request Body.
* **Nút Copy cURL tức thời:** Xuất toàn bộ cấu hình request hiện tại thành lệnh cURL hoàn chỉnh chỉ với 1 cú click trên thanh URL Bar để chia sẻ cho đồng nghiệp hoặc chạy kiểm thử trên Terminal.
* **Code Snippet Generator:** Xuất mã nguồn sang JavaScript (Fetch, Axios), Node.js, Python (Requests), Go, Dart/Flutter.

### 📁 6. Quản Lý Collections & Tổ Chức Thư Mục
* **Hỗ trợ Kéo & Thả (Drag and Drop):** Sắp xếp lại thứ tự, di chuyển request ra/vào các thư mục lồng nhau nhiều cấp mượt mà trên Sidebar.
* **Modal Save Request dạng Tree Picker:** Duyệt cây thư mục trực quan, có ô tìm kiếm thư mục nhanh và hiển thị đường dẫn Breadcrumb (`Collection > Folder > Subfolder`).
* **Đánh dấu trạng thái thay đổi chưa lưu (Dirty State Indicator):** Hiển thị chấm tròn `●` trên tab khi có nội dung bị chỉnh sửa so với bản lưu trong Collection. Cảnh báo thông minh khi người dùng đóng tab chưa lưu.

### 📊 7. Response Viewer Trực Quan & Kiểm Thử Tự Động
* **Hiển thị JSON sắc nét:** Pretty-print với CodeMirror OneDark Theme, định dạng số dòng, highlight cú pháp.
* **Chỉ số mạng chi tiết:** Huy hiệu Status Badge hiển thị mã trạng thái HTTP chuẩn kèm thời gian phản hồi (`ms`) và kích thước payload (`KB/MB`).
* **Nút toggle Wrap Lines:** Tự động bẻ dòng văn bản, cực kỳ hữu ích khi kiểm tra các chuỗi Access Token, JWT Token hoặc ID quá dài mà không cần cuộn ngang màn hình.
* **Sandbox Kiểm thử Tự động:** Hỗ trợ viết mã kiểm thử với cú pháp quen thuộc `pm.test`, `pm.expect`, tự động hiển thị bảng kết quả Pass/Fail trực quan sau mỗi lần gửi request.

---

## 💻 Yêu Cầu Hệ Thống & Cài Đặt (Installation & Setup)

### Yêu Cầu Môi Trường
* **Hệ điều hành:** Windows 10/11 (x64), macOS (Intel / Apple Silicon), hoặc Linux.
* **Node.js:** Phiên bản `>= 18.16.0` (Khuyến nghị phiên bản Node.js 20 LTS trở lên).
* **Package Manager:** `npm` (v9+), `yarn`, hoặc `pnpm`.

### Hướng Dẫn Clone & Cài Đặt Phụ Thuộc
Mở terminal và thực thi các câu lệnh sau:

```bash
# 1. Clone mã nguồn dự án từ repository
git clone https://github.com/khoahocmai/api-dk-lab.git

# 2. Di chuyển vào thư mục dự án
cd api-dk-lab

# 3. Cài đặt các gói phụ thuộc (dependencies)
npm install
```

### Khởi Chạy Chế Độ Phát Triển (Development Mode)
Để khởi chạy ứng dụng dưới môi trường phát triển (bao gồm Vite HMR cho Renderer và cửa sổ Desktop Electron tự động tải lại):

```bash
npm run dev
```

### Kiểm Tra Chất Lượng Mã Nguồn (Lint & Type-Check)
```bash
# Kiểm tra TypeScript type checking
npx tsc --noEmit

# Chạy kiểm tra quy chuẩn ESLint
npm run lint
```

### Đóng Gói Ứng Dụng Desktop (Production Build)
Lệnh build sẽ biên dịch TypeScript, đóng gói Renderer bằng Vite, build mã nguồn Main process và gọi `electron-builder` để tạo bộ cài đặt ứng dụng:

```bash
npm run build
```

Sau khi hoàn tất, tệp cài đặt độc lập sẽ được tạo ra tại thư mục:
* **Windows:** `release/1.0.0/API DK Lab-Windows-1.0.0-Setup.exe` (NSIS Installer) hoặc bản giải nén `release/1.0.0/win-unpacked/API DK Lab.exe`.
* **macOS:** `release/1.0.0/API DK Lab-Mac-1.0.0-Installer.dmg`.
* **Linux:** `release/1.0.0/API DK Lab-Linux-1.0.0.AppImage`.

---

## 🚀 Hướng Dẫn Sử Dụng Chi Tiết (Step-by-Step User Guide)

Dưới đây là các kịch bản sử dụng thực tế giúp bạn nhanh chóng làm chủ mọi tính năng của API Lab:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              GIAO DIỆN LÀM VIỆC CHÍNH                                  │
├─────────────┬────────────────────────────────────────────┬─────────────────────────────┤
│   SIDEBAR   │            REQUEST WORKSPACE               │       RESPONSE VIEWER       │
│             │                                            │                             │
│ Collections │ [GET] {{Domain}}/api/v1/orders/:id  [Send] │ Status: 200 OK  •  124 ms   │
│             ├────────────────────────────────────────────┼─────────────────────────────┤
│     và      │ Params | Path Vars | Headers | Auth | Body │ Pretty JSON | Raw | Headers │
│             │                                            │                             │
│Environments │ orderId: 884920                            │ {                           │
│             │ status: ACTIVE                             │   "success": true,          │
│             │                                            │   "data": { ... }           │
│             │                                            │ }                           │
└─────────────┴────────────────────────────────────────────┴─────────────────────────────┘
```

### A. Thiết Lập Môi Trường & Biến (Environments)
1. **Mở Quản lý Môi trường:** Nhấp vào tab **Environments** ở thanh Sidebar bên trái.
2. **Tạo Môi trường:** Bấm vào nút **"+ New"** và đặt tên cho môi trường (ví dụ: `Development`, `Staging`, hoặc `Local`).
3. **Khai báo các biến:** Bấm **"+ Variable"** để thêm các cặp khóa - giá trị:
   * `Domain`: `http://localhost:3000` hoặc `https://api.example.com`
   * `token`: Nhập mã JWT token hoặc Bearer token của bạn.
   * *Mẹo bảo mật:* Bấm vào biểu tượng **Con mắt** (👁️) tại dòng `token` để chuyển sang chế độ bí mật (`secret: true`), giá trị sẽ được che giấu an toàn khi trình chiếu màn hình.
4. **Kích hoạt môi trường:** Sử dụng thanh **Quick Switcher** ở góc trên cùng của Topbar để chọn môi trường làm việc hiện tại.
5. **Mẹo phím tắt Isolate Variable:** Trong bảng danh sách biến, nhấn giữ phím `Alt` và click vào checkbox của 1 biến bất kỳ — hệ thống sẽ tự động bật biến đó và tắt toàn bộ các biến còn lại.

---

### B. Tạo & Gửi REST Request
1. **Tạo Request mới:** Bấm biểu tượng dấu cộng **"+"** trên thanh Tab bar hoặc sử dụng phím tắt `Ctrl + T` (hoặc `Cmd + T`).
2. **Soạn thảo URL:** Nhập đường dẫn có chứa biến môi trường và Path Variable:
   ```text
   {{Domain}}/api/v1/orders/:orderId?status=ACTIVE
   ```
3. **Cấu hình Path Variables:** Chuyển xuống bảng **Path Variables** (hệ thống tự động hiển thị khi phát hiện `:orderId`), nhập giá trị thực tế cho `orderId` (ví dụ: `100245`).
4. **Xem trước giá trị:** Rê chuột lên chip `{{Domain}}` hoặc chip `:orderId` trên thanh URL Bar để xem Tooltip hiển thị giá trị phân giải thực tế.
5. **Thiết lập Headers & Auth:**
   * Chọn tab **Auth** -> Chọn loại `Bearer Token` -> Nhập `{{token}}`.
   * Chọn tab **Headers** để bổ sung các header đặc thù (các header chuẩn như `Content-Type: application/json` sẽ được tự động cấu hình khi cần).
6. **Soạn thảo Body (POST/PUT):**
   * Chuyển sang tab **Body** -> Chọn `raw JSON`.
   * Nhập dữ liệu JSON. Bạn có thể bấm **Format JSON** để căn chỉnh lề đẹp mắt. Nếu lỡ tay để lại dấu phẩy thừa ở cuối thuộc tính (`trailing comma`), API Lab sẽ tự động làm sạch khi gửi.
7. **Gửi Request:** Bấm nút **Send** màu xanh hoặc nhấn tổ hợp phím `Ctrl + Enter`. Kết quả phản hồi sẽ hiển thị tức thì tại panel bên phải.

---

### C. Khai Thác GraphQL Với Schema Explorer
1. **Cấu hình Endpoint:** Đảm bảo Environment đang chọn đã có biến `Domain` trỏ tới GraphQL endpoint (ví dụ: `https://api.spacex.land/graphql` hoặc `{{Domain}}/graphql`).
2. **Mở giao diện GraphQL:** Bấm nút **"+"** -> Chọn **New GraphQL Request**, hoặc bấm biểu tượng **Explorer** ở góc trái để mở panel GraphQL Explorer.
3. **Nạp Schema Tự động (Introspection):** Bấm nút **"Reload Schema"**. Ứng dụng sẽ gửi truy vấn nội quan và dựng thành công cây Schema hoàn chỉnh.
4. **Tìm kiếm & Chọn trường:**
   * Gõ tên Query hoặc Mutation cần gọi vào ô **Search**.
   * Tick chọn các trường (Fields) và đối số (Arguments) mong muốn.
   * Ngay lập tức, câu truy vấn GraphQL chuẩn cú pháp sẽ tự động được sinh ra trong khung soạn thảo phía trên.
   * Ngăn kéo **Variables** ở đáy sẽ tự động khởi tạo khung JSON với đầy đủ các đối số tương ứng.
5. **Chỉnh sửa Variables & Thực thi:** Điền giá trị cho các biến trong khung Variables và bấm **Send** (`Ctrl + Enter`).

---

### D. Quản Lý Presets (Bộ Dữ Liệu Đầu Vào Theo Kịch Bản)
Tính năng Presets giúp bạn kiểm tra nhiều kịch bản đầu vào khác nhau trên cùng một API mà không cần sao chép tạo thêm request mới:

1. Tại khung soạn thảo **GraphQL Variables** hoặc tab **REST Body (raw JSON)**:
2. Soạn bộ dữ liệu cho kịch bản thứ nhất (ví dụ: dữ liệu đơn hàng cho chi nhánh Quận 1):
   ```json
   {
     "branchId": "Q1_STORE",
     "paymentMethod": "COD"
   }
   ```
3. Bấm nút **Save Preset** -> Đặt tên: `Chi nhánh Quận 1` -> Bấm **Save**.
4. Tiếp tục sửa dữ liệu cho kịch bản thứ hai (ví dụ: đơn hàng chi nhánh Quận 7):
   ```json
   {
     "branchId": "Q7_STORE",
     "paymentMethod": "MOMO"
   }
   ```
5. Bấm nút **Save Preset** -> Chọn **"Lưu thành Preset mới..."** -> Đặt tên: `Chi nhánh Quận 7`.
6. Giờ đây, bạn chỉ cần bấm vào **Dropdown Preset** để chuyển đổi qua lại nhanh chóng giữa các kịch bản kiểm thử.

---

### E. Import & Export Lệnh cURL
* **Import cURL:**
  1. Bấm nút **"Import cURL"** trên thanh Header Topbar (hoặc dán trực tiếp câu lệnh cURL vào thanh URL Bar).
  2. Dán mã cURL vào hộp thoại (hỗ trợ lệnh phức tạp, định dạng nhiều dòng `\`, `$'...'`).
  3. Bấm **"Parse & Import"**. Hệ thống sẽ tự động phân tích và điền toàn bộ Method, URL, Headers, Tokens và Body vào giao diện làm việc.
* **Copy cURL:**
  * Bấm nút **"Copy cURL"** trên thanh URL Bar để sao chép nhanh câu lệnh cURL của request hiện tại vào Clipboard phục vụ trao đổi qua Slack, Teams hoặc Terminal.

---

### F. Tổ Chức & Quản Trị Collections
1. **Lưu Request:** Sau khi thiết lập request xong, nhấn `Ctrl + S` (hoặc `Cmd + S`).
2. **Chọn Vị trí Lưu:** Hộp thoại **Save Request Modal** xuất hiện:
   * Đặt tên cho Request.
   * Duyệt cây thư mục qua Tree Picker, bạn có thể tạo Collection mới hoặc tạo Folder con lồng nhau.
   * Bấm **Save** để lưu bền vững vào `data/collections.json`.
3. **Kéo & Thả (Drag and Drop):** Trên cây thư mục Sidebar, bạn có thể kéo thả tự do để đổi vị trí request, đưa request vào trong folder hoặc di chuyển ra ngoài thư mục gốc.

---

## 📁 Cấu Trúc Thư Mục Dự Án (Project Structure)

```text
api-dk-lab/
├── electron/                           # TIẾN TRÌNH MAIN & PRELOAD (NODE.JS)
│   ├── electron-env.d.ts               # Khai báo kiểu dữ liệu môi trường Electron
│   ├── main.ts                         # Entry point Main Process, IPC Handlers, HTTP Engine
│   ├── preload.ts                      # Security Context Bridge, phơi bày window.desktopApi
│   └── storage.ts                      # Xử lý đọc/ghi file JSON cục bộ an toàn
├── src/                                # TIẾN TRÌNH RENDERER (REACT + TYPESCRIPT)
│   ├── assets/                         # Tài nguyên hình ảnh, biểu tượng SVG
│   ├── components/                     # Các React Components phân theo chức năng
│   │   ├── common/                     # Components dùng chung (Modal, Toast, CodeEditor, Tooltip)
│   │   ├── graphql/                    # Phân hệ GraphQL Explorer (Explorer, GraphFieldCard, Badge)
│   │   ├── layout/                     # Khung layout tổng thể (Sidebar, MainPanel, ExplorerPanel)
│   │   ├── request/                    # Trình soạn thảo Request (UrlBar, RequestEditor, KeyValueTable)
│   │   ├── response/                   # Panel hiển thị phản hồi (ResponseViewer, StatusBadge)
│   │   ├── settings/                   # Cài đặt ứng dụng (SettingsModal)
│   │   └── sidebar/                    # Khối chức năng Sidebar (CollectionsTree, EnvironmentsManager)
│   ├── hooks/                          # Custom React Hooks (useAppZoom...)
│   ├── services/                       # Tầng Business Logic & Dịch vụ Nền tảng
│   │   ├── graphqlService.ts           # Schema Introspection, AST Generator, 2-way Sync
│   │   ├── httpService.ts              # Gateway dispatch request qua IPC, body sanitize
│   │   ├── scriptRunner.ts             # Sandbox thực thi Test Scripts (pm.* API)
│   │   ├── storageService.ts           # Storage Adapter, quản lý dirty tracking & snapshot
│   │   └── templateService.ts          # Bộ giải mã Mustache {{variable}}, Path Variables
│   ├── types/                          # Định nghĩa TypeScript Types & Interfaces
│   ├── utils/                          # Hàm tiện ích thuần túy (cURL parser, JSON helper, Tree helper)
│   ├── App.tsx                         # Component trung tâm điều phối trạng thái ứng dụng
│   ├── index.css                       # Design Tokens, hệ màu OneDark Dark Theme
│   └── main.tsx                        # Entry point của React DOM
├── data/                               # DỮ LIỆU LƯU TRỮ CỤC BỘ (JSON STORAGE)
│   ├── collections.json                # Lưu Collections, Thư mục và Requests
│   ├── environments.json               # Lưu danh sách Môi trường và Biến Key-Value
│   ├── history.json                    # Nhật ký các lần gửi request gần nhất
│   └── settings.json                   # Lưu cấu hình ứng dụng và trạng thái các Tabs
├── docs/                               # TÀI LIỆU DỰ ÁN
│   └── PROJECT_DOCUMENTATION.md        # Tài liệu đặc tả kiến trúc kỹ thuật toàn diện
├── electron-builder.json5              # Cấu hình đóng gói ứng dụng Desktop
├── package.json                        # Khai báo thư viện phụ thuộc và scripts
├── tsconfig.json                       # Cấu hình TypeScript compiler
└── vite.config.ts                      # Cấu hình Vite bundler kết hợp Electron plugin
```

---

## ⌨️ Bảng Phím Tắt Tiện Dụng (Keyboard Shortcuts)

Để nâng cao tối đa tốc độ thao tác, API Lab hỗ trợ các tổ hợp phím tắt tiêu chuẩn:

| Phím Tắt (Windows / Linux) | Phím Tắt (macOS) | Hành Động Thực Hiện |
| :--- | :--- | :--- |
| `Ctrl + T` hoặc `Ctrl + N` | `Cmd + T` hoặc `Cmd + N` | Mở một Tab Request REST mới |
| `Ctrl + W` | `Cmd + W` | Đóng Tab Request đang mở hiện tại |
| `Ctrl + Enter` | `Cmd + Enter` | **Gửi Request** (hoặc Hủy bỏ nếu đang gửi) |
| `Ctrl + S` | `Cmd + S` | **Lưu Request** vào Collection (mở Tree Picker) |
| `Ctrl + B` | `Cmd + B` | Đóng / Mở nhanh thanh Sidebar bên trái |
| `Ctrl + =` / `Ctrl + +` | `Cmd + =` / `Cmd + +` | Phóng to tỉ lệ giao diện (Zoom In) |
| `Ctrl + -` | `Cmd + -` | Thu nhỏ tỉ lệ giao diện (Zoom Out) |
| `Ctrl + 0` | `Cmd + 0` | Đặt lại tỉ lệ giao diện chuẩn 100% (Reset Zoom) |
| `Alt + Click` vào Checkbox biến | `Option + Click` vào Checkbox | **Isolate Variable**: Chỉ bật biến này và tắt tất cả biến khác |
| `Alt + Click` vào nút đóng Tab (x) | `Option + Click` vào nút đóng Tab | **Close Others**: Đóng toàn bộ các tab khác trừ tab này |

---

## 🛡️ Bản Quyền & Giấy Phép (License)

Dự án được phân phối dưới giấy phép mã nguồn mở **MIT License**. Mọi đóng góp, báo lỗi (Issues) hoặc yêu cầu tính năng mới (Pull Requests) đều được hoan nghênh.

---

<div align="center">

**API Lab** — Xây dựng với niềm đam mê dành cho cộng đồng phát triển API & GraphQL.

</div>
