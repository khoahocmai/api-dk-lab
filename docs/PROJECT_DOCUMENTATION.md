# TÀI LIỆU THIẾT KẾ KIẾN TRÚC & ĐẶC TẢ KỸ THUẬT TOÀN DIỆN
## DỰ ÁN: API DK LAB (DESKTOP API CLIENT & GRAPHQL WORKSPACE)

> **Phiên bản tài liệu:** 1.0.0  
> **Ngày cập nhật:** Tháng 09/2026  
> **Trạng thái:** Active / Production-Ready  
> **Chủ quản kiến trúc:** Principal Software Architect & Technical Lead

---

## MỤC LỤC

1. [Giới thiệu Dự án & Tầm nhìn Kiến trúc](#1-giới-thiệu-dự-án--tầm-nhìn-kiến-trúc)
2. [Kiến trúc Hệ thống & Luồng Xử lý Dữ liệu (System Architecture & Data Flow)](#2-kiến-trúc-hệ-thống--luồng-xử-lý-dữ-liệu)
3. [Cấu trúc Thư mục & Phân chia Trách nhiệm Module](#3-cấu-trúc-thư-mục--phân-chia-trách-nhiệm-module)
4. [Danh mục Tính năng Trọng yếu (Core Features Deep Dive)](#4-danh-mục-tính-năng-trọng-yếu)
5. [Mô hình Dữ liệu & Lưu trữ Bền vững (Data Models & Storage Schema)](#5-mô-hình-dữ-liệu--lưu-trữ-bền-vững)
6. [Hướng dẫn Môi trường & Quy trình Vận hành (Developer Guide & Workflow)](#6-hướng-dẫn-môi-trường--quy-trình-vận-hành)
7. [Quy chuẩn Thiết kế Giao diện & Hướng dẫn Mở rộng (Design Tokens & Extension Guidelines)](#7-quy-chuẩn-thiết-kế-giao-diện--hướng-dẫn-mở-rộng)

---

## 1. GIỚI THIỆU DỰ ÁN & TẦM NHÌN KIẾN TRÚC

### 1.1. Bối cảnh & Mục tiêu (Context & Mission)
**API DK Lab** (tiền thân: *DK API Tester*) là một Desktop API Workspace hiệu năng cao, siêu nhẹ, chạy trực tiếp trên máy tính cục bộ của lập trình viên. Ứng dụng được sinh ra nhằm giải quyết triệt để các bài toán nhức nhối của các công cụ API client truyền thống (như Postman, Insomnia):
- **Hiệu năng & Tiêu tốn Tài nguyên:** Các công cụ hiện đại ngày càng nặng nề, khởi động chậm, chiếm dụng hàng gigabyte RAM và CPU. API DK Lab tối ưu hóa thời gian khởi động dưới 1 giây, chiếm dụng bộ nhớ thấp (< 150MB).
- **Rào cản Đăng nhập & Ép buộc Cloud-Sync:** Nhiều công cụ buộc người dùng phải đăng nhập tài khoản đám mây để lưu collection hoặc sử dụng tính năng cơ bản, tiềm ẩn rủi ro rò rỉ bí mật nội bộ (API Keys, Bearer Tokens, Internal Endpoints).
- **Tối ưu chuyên sâu song song REST & GraphQL:** Trong khi hầu hết công cụ xem GraphQL như một HTTP POST thô thứ cấp, API DK Lab xây dựng một bộ công cụ GraphQL chuyên biệt (AST Schema Introspection, Bi-directional Reverse Sync, Unified Query/Variables Pane, Input Presets).

### 1.2. Triết lý Thiết kế Cốt lõi (Design Philosophy)
1. **Local-First & Full Offline 100%:** Toàn bộ dữ liệu Workspace, Collections, Environments, Settings và Request History được lưu trữ dưới dạng các file JSON cục bộ chuẩn mực tại thư mục `data/` (hoặc `userData/data` khi đóng gói). Không phụ thuộc server trung gian, không gửi telemetry bí mật.
2. **Zero-CORS qua Node.js IPC:** Không bị giới hạn bởi rào cản Same-Origin Policy (CORS) của trình duyệt web. Toàn bộ các yêu cầu HTTP/HTTPS mạng đều được ủy quyền (delegate) thực thi trực tiếp từ Node.js Main Process.
3. **Developer Ergonomics (Trải nghiệm Nhà phát triển):** Hỗ trợ breakpoint debugging mượt mà với cấu hình `timeout = 0`, cơ chế làm sạch dấu phẩy thừa (trailing commas) tự động theo chuẩn RFC 8259, Dynamic Path Variables (`:param`), và hệ thống bộ dữ liệu mẫu (Presets) theo từng request.
4. **Bảo mật Ngữ cảnh (Context Security):** Cơ chế **Domain Mismatch Guard** tự động cảnh báo lập trình viên khi token môi trường nội bộ vô tình bị gửi sang domain ngoại lai hoặc domain của môi trường khác.

---

## 2. KIẾN TRÚC HỆ THỐNG & LUỒNG XỬ LÝ DỮ LIỆU

### 2.1. Kiến trúc Phân tầng Electron (Two-Process Model)
Hệ thống tuân thủ nghiêm ngặt mô hình phân tách tiến trình bảo mật chuẩn của Electron:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RENDERER PROCESS (UI LAYER)                        │
│   React 18  •  TypeScript  •  Vite  •  CodeMirror 6  •  Tailwind CSS        │
│   - Quản lý Application State (Tabs, Collections, Environments)             │
│   - AST Query Parser & GraphQL Explorer Synchronization                     │
│   - Biến dịch Template Engine ({{variable}}, :pathVariables)                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ IPC (Context Bridge)
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRELOAD SCRIPT (SECURITY CONTEXT BRIDGE)                 │
│   electron/preload.ts  ──►  window.desktopApi (Whitelisted Channels Only)   │
│   - 'http-request'   - 'http-cancel'   - 'storage:read'   - 'storage:write' │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼ Native IPC Events
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MAIN PROCESS (NODE.JS RUNTIME)                        │
│   electron/main.ts  •  electron/storage.ts                                  │
│   - Quản lý vòng đời ứng dụng & Cửa sổ (BrowserWindow)                      │
│   - HTTP Client Engine (Axios + Persistent KeepAlive Sockets)               │
│   - Zero-delay Localhost Routing (Bypass Windows Proxy Scan)                │
│   - Atomic File Storage Service (Native fs operations trên data/*.json)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### A. Main Process (`electron/main.ts` & `electron/storage.ts`)
- **Quản lý Cửa sổ:** Tạo cửa sổ chính với kích thước mặc định 1320x860, cấu hình bảo mật `contextIsolation: true`, `nodeIntegration: false`, tắt hoàn toàn việc truy cập trực tiếp Node API từ UI.
- **HTTP Dispatcher Gateway:**
  - Khởi tạo các Persistent HTTP/HTTPS Agents (`keepAlive: true`, `maxSockets: 100`, `timeout: 0`).
  - Hỗ trợ cờ `rejectUnauthorized: false` (Self-signed certificates cho các server nội bộ/staging).
  - Tắt quét Proxy hệ điều hành (`proxy: false`) để triệt tiêu độ trễ 1-3 giây trên Windows đối với các dải IP cục bộ (`localhost`, `127.0.0.1`, `::1`).
  - Sử dụng `validateStatus: () => true` để đảm bảo Main Process bắt trọn mọi mã phản hồi HTTP (2xx, 3xx, 4xx, 5xx) thay vì ném Axios rejection.
  - Đo đạc thời gian phản hồi với độ chính xác cao bằng `process.hrtime.bigint()`.
- **Atomic File Storage Handlers:**
  - `storage:read`: Đọc file JSON an toàn, parse và trả về renderer object.
  - `storage:write`: Ghi dữ liệu đã format thụt lề 2 spaces xuống file, tự động tạo thư mục cha nếu chưa tồn tại.

#### B. Preload Context Bridge (`electron/preload.ts`)
- Đóng gói toàn bộ khả năng giao tiếp của UI vào đối tượng `window.desktopApi`.
- Cơ chế kiểm duyệt kênh an toàn (**Allowed Channels Whitelist**):
  - `http-request`: Gửi payload yêu cầu HTTP.
  - `http-cancel`: Hủy bỏ yêu cầu HTTP đang chạy thông qua `requestId`.
  - `storage:read` & `storage:write`: Truy xuất và lưu trữ file dữ liệu.
  - `setZoomFactor` & `getZoomFactor`: Điều chỉnh tỉ lệ hiển thị giao diện.

#### C. Renderer Process (`src/`)
- Xây dựng trên React 18, Vite bundler và TypeScript nghiêm ngặt (`strict: true`).
- Giao diện dạng Tab thông minh, hỗ trợ Split Panel kéo thả mượt mà (`react-resizable-panels`).
- Bộ soạn thảo mã nguồn chuyên nghiệp hỗ trợ cú pháp JSON, GraphQL, JavaScript sử dụng **CodeMirror 6** (`@uiw/react-codemirror`).

---

### 2.2. Sơ đồ Luồng Gửi Request (Request Dispatch Pipeline)

```
[ Người dùng kích hoạt Send ]
             │
             ▼
[ 1. Template Engine Resolution ]
  - Thay thế biến {{Domain}}, {{token}} từ Active Environment
  - Thay thế Path Variables :id, :code vào URL
  - Cảnh báo Domain Mismatch nếu URL không thuộc Domain kích hoạt
             │
             ▼
[ 2. Header Composition Engine ]
  - Tạo bộ Header hệ thống tự động (User-Agent, Content-Type, Accept)
  - Hợp nhất User Headers (Ưu tiên đè các giá trị trùng lặp)
             │
             ▼
[ 3. Body & Variables Sanitization ]
  - Chạy sanitizeTrailingCommas() loại bỏ dấu phẩy thừa trước } hoặc ]
  - Chuẩn hóa JSON Payload tuân thủ nghiêm ngặt RFC 8259
             │
             ▼
[ 4. Pre-Request Script Execution ]
  - Chạy mã JavaScript tiền xử lý trong Sandbox (nếu có cấu hình)
             │
             ▼
[ 5. IPC Invoke ('http-request') ] ─── (Vượt qua Renderer Sandbox)
             │
             ▼
[ 6. Node.js Main Process Execution ]
  - Áp dụng HTTPS Agent (Reject / Allow Unauthorized)
  - Dispatch qua Axios Client Native
  - Đo lường thời gian (ms), kích thước tải (KB/MB)
             │
             ▼
[ 7. Response Handler & Tests Runner ]
  - Trả ResponseState về Renderer qua IPC Promise
  - Render StatusBadge, ResponseViewer (OneDark JSON Tree)
  - Kích hoạt Post-response Test Scripts (`pm.test`, `pm.expect`)
  - Ghi nhận lịch sử (History Item)
```

---

## 3. CẤU TRÚC THƯ MỤC & PHÂN CHIA TRÁCH NHIỆM MODULE

```text
api-dk-lab/
├── data/                               # Dữ liệu cục bộ (JSON Schema v4)
│   ├── collections.json                # Danh mục Collections, Folders, Requests đã lưu
│   ├── environments.json               # Danh sách Môi trường và các cặp Key-Value biến
│   ├── history.json                    # Lịch sử các lần gửi request
│   └── settings.json                   # Cấu hình ứng dụng và trạng thái phiên làm việc (Tabs)
├── docs/                               # Tài liệu kiến trúc & đặc tả kỹ thuật dự án
│   └── PROJECT_DOCUMENTATION.md        # File tài liệu kiến trúc toàn diện
├── electron/                           # Mã nguồn Tiến trình Main & Preload (Node.js)
│   ├── electron-env.d.ts               # Khai báo kiểu môi trường Electron
│   ├── main.ts                         # Entry point Main Process, IPC Handlers, Window lifecycle
│   ├── preload.ts                      # ContextBridge bảo mật, đóng gói window.desktopApi
│   └── storage.ts                      # File Storage Controller (Đọc/Ghi data/ trực tiếp)
├── public/                             # Tài nguyên tĩnh (Icons, Assets)
├── src/                                # Mã nguồn Renderer Process (React + TypeScript)
│   ├── assets/                         # SVG và hình ảnh giao diện
│   ├── components/                     # Các UI Components phân chia theo vai trò
│   │   ├── common/                     # Components dùng chung (Buttons, Modals, Inputs, Tooltips)
│   │   │   ├── Badge.tsx               # Hiển thị nhãn tag, count
│   │   │   ├── CodeEditor.tsx          # Wrapper CodeMirror 6 (JSON, GraphQL, JS)
│   │   │   ├── CodeSnippetModal.tsx    # Modal xuất mã nguồn cURL, Fetch, Python, Go...
│   │   │   ├── EnvironmentSelector.tsx # Dropdown chọn môi trường nhanh trên header
│   │   │   ├── InfoCard.tsx            # Card hiển thị thông tin hướng dẫn
│   │   │   ├── Modal.tsx               # Khung Modal nền tảng
│   │   │   ├── TemplateInput.tsx       # Ô nhập văn bản hỗ trợ render chip {{var}}
│   │   │   ├── TemplateUrlInput.tsx    # Ô nhập URL thông minh (chip biến, path param, domain badge)
│   │   │   ├── Toast.tsx               # Hệ thống thông báo nổi (Success, Error, Warning, Info)
│   │   │   └── VariableTooltip.tsx     # Tooltip soi nhanh giá trị biến môi trường khi hover
│   │   ├── graphql/                    # Phân hệ giao diện GraphQL Explorer
│   │   │   ├── Explorer.tsx            # Cây chọn Fields, Arguments và Output Fields
│   │   │   ├── GraphFieldCard.tsx      # Thẻ trường Query/Mutation có checkbox và form đối số
│   │   │   └── GraphTypeBadge.tsx      # Huy hiệu kiểu dữ liệu (String!, Int, Boolean...)
│   │   ├── layout/                     # Khung cấu trúc tổng thể ứng dụng
│   │   │   ├── ExplorerPanel.tsx       # Cột bên trái hiển thị GraphQL Explorer
│   │   │   ├── MainPanel.tsx           # Khu vực trung tâm (Tabs bar, URL bar, Resizable Panels)
│   │   │   ├── MobileNav.tsx           # Thanh điều hướng màn hình hẹp
│   │   │   └── Sidebar.tsx             # Thanh bên điều khiển chuyển đổi Collections / Environments
│   │   ├── request/                    # Bộ soạn thảo Request
│   │   │   ├── AuthEditor.tsx          # Cấu hình chứng thực (Bearer Token, Basic Auth, API Key)
│   │   │   ├── BodyEditor.tsx          # Re-export RequestBodyEditor
│   │   │   ├── CurlImportModal.tsx     # Modal phân tích và nạp mã cURL thông minh
│   │   │   ├── FolderPicker.tsx        # Cây chọn thư mục dạng modal lồng nhau
│   │   │   ├── KeyValueTable.tsx       # Bảng cặp Key-Value (Params, Headers, Form-Data)
│   │   │   ├── PresetSelector.tsx      # Thanh chọn và quản lý bộ dữ liệu mẫu (Input Presets)
│   │   │   ├── RequestBodyEditor.tsx   # Trình soạn thảo Body REST (raw JSON, text, form-data, urlencoded)
│   │   │   ├── RequestEditor.tsx       # Trình soạn thảo tổng hợp (Subtabs Params, Auth, Headers, Query/Body)
│   │   │   ├── RequestTabs.tsx         # Thanh quản lý các Tab request đang mở
│   │   │   ├── SaveRequestModal.tsx    # Modal lưu Request vào Collection kèm Tree Picker
│   │   │   ├── TestScriptEditor.tsx    # Trình soạn thảo mã tiền xử lý và kiểm thử tự động
│   │   │   ├── UnsavedChangesModal.tsx # Cảnh báo khi đóng Tab có thay đổi chưa lưu
│   │   │   └── UrlBar.tsx              # Thanh URL chính (Method, Input, Send, Save, Curl, Snippet)
│   │   ├── response/                   # Khu vực hiển thị kết quả phản hồi
│   │   │   ├── ResponseViewer.tsx      # Viewer chính (Status bar, Pretty JSON, Raw, Headers, Tests)
│   │   │   ├── StatusBadge.tsx         # Huy hiệu mã trạng thái HTTP (200 OK, 404, 500...)
│   │   │   └── TestResultsViewer.tsx   # Bảng tổng hợp kết quả Pass/Fail của Test Scripts
│   │   ├── settings/                   # Cài đặt ứng dụng
│   │   │   └── SettingsModal.tsx       # Modal cấu hình Timeout, SSL, Font size, Reset Data
│   │   └── sidebar/                    # Khối chức năng trong Sidebar
│   │       ├── CollectionsTree.tsx     # Cây Collections, Folders, Requests kéo thả, CRUD
│   │       └── EnvironmentsManager.tsx # Giao diện quản lý các Môi trường và Biến chuyên sâu
│   ├── hooks/                          # Custom React Hooks
│   │   └── useAppZoom.ts               # Hook điều khiển phím tắt phóng to/thu nhỏ (Ctrl +/-/0)
│   ├── services/                       # Tầng Business Logic & Dịch vụ Nền tảng
│   │   ├── graphqlService.ts           # Introspection, AST Generator, Deep Merge, Reverse Sync
│   │   ├── httpService.ts              # Gateway gửi HTTP qua IPC và fallback Web, body sanitization
│   │   ├── scriptRunner.ts             # Sandbox chạy Test Script (pm.* API)
│   │   ├── storageService.ts           # File Storage Adapter, khởi tạo mặc định, snapshot tracking
│   │   └── templateService.ts          # Bộ giải mã Mustache {{var}}, Path Variables, Headers Resolver
│   ├── types/                          # Định nghĩa TypeScript Types & Interfaces
│   │   ├── auth.types.ts               # Định nghĩa cấu trúc Auth (Bearer, Basic, ApiKey)
│   │   ├── env.types.ts                # Định nghĩa Environment & EnvironmentVariable
│   │   ├── graphql.types.ts            # Định nghĩa GraphQL Schema, Field, Argument
│   │   ├── history.types.ts            # Định nghĩa bản ghi lịch sử gửi request
│   │   ├── index.ts                    # Re-export toàn bộ kiểu dữ liệu
│   │   ├── request.types.ts            # Định nghĩa RequestItem, RequestTab, DataPreset, KeyValueRow
│   │   ├── settings.types.ts           # Định nghĩa cấu hình AppSettings
│   │   └── test.types.ts               # Định nghĩa báo cáo kiểm thử TestRunReport
│   ├── utils/                          # Thư viện tiện ích phụ trợ (Pure Functions)
│   │   ├── codeGenerators.ts           # Bộ sinh mã nguồn đa ngôn ngữ (cURL, Fetch, Python, Go...)
│   │   ├── curlHelper.ts               # Parser cURL thông minh và reverse builder
│   │   ├── formatters.ts               # Định dạng dung lượng, trạng thái, tạo snapshot dirty check
│   │   ├── jsonHelper.ts               # Làm sạch trailing commas an toàn, parse relaxed JSON
│   │   ├── postmanHelper.ts            # Import / Export Postman Collection v2.1
│   │   ├── templateHelper.ts           # Tokenizer phân tách chuỗi template
│   │   ├── testRunner.ts               # Assertion Engine nội bộ
│   │   ├── treeHelper.ts               # Thao tác trên cây phân cấp Collection/Folder/Request
│   │   └── urlHelper.ts                # Parser query params, path variables, kiểm tra localhost
│   ├── App.css                         # Bộ stylesheet CSS đồng bộ Dark Theme chuẩn mực
│   ├── App.tsx                         # Root Component, Orchestrator điều phối trạng thái toàn ứng dụng
│   ├── index.css                       # CSS reset, biến màu tokens CSS toàn cục
│   ├── main.tsx                        # Entry point của React DOM
│   └── vite-env.d.ts                   # Định nghĩa môi trường Vite & DesktopApi interface
├── electron-builder.json5              # Cấu hình đóng gói ứng dụng Desktop cho Windows/Mac/Linux
├── package.json                        # Khai báo dependencies, scripts và metadata ứng dụng
├── tsconfig.json                       # Cấu hình TypeScript Compiler cho Renderer
├── tsconfig.node.json                  # Cấu hình TypeScript Compiler cho Vite/Electron build
└── vite.config.ts                      # Cấu hình Vite tích hợp plugin electron & electron-renderer
```

---

## 4. DANH MỤC TÍNH NĂNG TRỌNG YẾU

### 4.1. Bộ Công cụ Chuyên biệt cho GraphQL (GraphQL Suite)
- **Introspection Schema Tự động:**
  - Ứng dụng gửi truy vấn nội quan (`getIntrospectionQuery()`) đến endpoint được cấu hình trong Environment (`{{Domain}}`).
  - Phân tích cây Schema hoàn chỉnh thành hai nhóm: `Query Fields` và `Mutation Fields`, bóc tách toàn bộ kiểu dữ liệu đầu vào (`GraphInputField`) và trường trả về (`GraphOutputField`).
- **GraphQL Explorer Trực quan:**
  - Hiển thị danh sách các root fields kèm ô tìm kiếm thời gian thực.
  - Cho phép tick chọn đối số (Arguments) và trường dữ liệu trả về (Fields lồng nhau đa tầng).
  - Tự động sinh mã truy vấn chuẩn mực theo cú pháp GraphQL AST.
- **Unified Query & Variables Pane:**
  - Khung soạn thảo tích hợp chia ngăn theo chiều dọc (`react-resizable-panels`): Phía trên là GraphQL Query / Mutation, phía dưới là ngăn kéo **Variables** (JSON).
  - Ngăn Variables có thể thu gọn xuống thanh bar đáy chỉ với 1 click (`ChevronDown` / `ChevronUp`) giúp tối ưu diện tích soạn thảo query khi không cần dùng biến.
- **Đồng bộ Đảo chiều (Bi-directional Reverse Sync) với Debounce 300ms:**
  - Khi người dùng gõ tay hoặc dán code vào Editor Query/Variables, hệ thống sử dụng `parse()` từ thư viện `graphql` để duyệt AST, tự động tính toán và tick lại chính xác các checkbox tương ứng trên cây Explorer bên trái.
  - Áp dụng bộ đệm trễ (debounce) 300ms nhằm ngăn chặn triệt để xung đột vòng lặp vô hạn (Infinite Update Loop) giữa Editor và Explorer.
- **Nút "Sync to Explorer":**
  - Cung cấp nút đồng bộ thủ công tức thời kèm phản hồi trực quan (`Synced! ✓`) giúp người dùng chủ động nạp lại trạng thái Explorer từ Editor bất kỳ lúc nào.

---

### 4.2. Trình Soạn thảo REST & Xử lý URL Động (Dynamic REST Engine)
- **Hỗ trợ Đầy đủ Phương thức HTTP:**
  - `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, `OPTIONS`.
  - Huy hiệu màu nhận diện chuẩn hóa theo chuẩn quốc tế (GET: Xanh ngọc, POST: Xanh lá, PUT: Cam, PATCH: Vàng, DELETE: Đỏ, GRAPHQL: Tím).
- **Dynamic Path Variables (`:param`):**
  - Tự động phát hiện các token định danh dạng `:id`, `:storeId`, `:tenantCode` trên đường dẫn URL.
  - Tự động khởi tạo bảng **Path Variables** riêng biệt, hỗ trợ thay thế giá trị thực tế hoặc lồng ghép biến môi trường `{{var}}`.
  - URL Bar hiển thị chip nổi bật vị trí của Path Variable kèm tooltip khi rê chuột.
- **Đồng bộ 2 chiều Query Parameters:**
  - Khi sửa chuỗi `?key=value` trên thanh URL, bảng Key-Value tự động cập nhật.
  - Ngược lại, khi bật/tắt hoặc thêm bớt hàng trong bảng Query Params, URL tự động được cấu trúc lại chuẩn xác qua `URLSearchParams`.
- **Tự động Làm sạch Dấu phẩy Thừa (Trailing Commas Sanitization):**
  - Giải quyết dứt điểm lỗi cú pháp phổ biến khi người dùng để lại dấu phẩy ở thuộc tính cuối cùng trước dấu `}` hoặc `]`.
  - Hàm `sanitizeTrailingCommas` bóc tách từng ký tự, bảo vệ an toàn tuyệt đối các dấu phẩy nằm bên trong chuỗi ký tự (`"..."`), hỗ trợ escape quotes (`\"`) và backslashes (`\\`).
  - Nút **Format JSON** tự động làm sạch và thụt lề 2 spaces đẹp mắt. Khi bấm **Send**, payload được tự động làm sạch trước khi gửi qua mạng.

---

### 4.3. Quản lý Bộ dữ liệu Mẫu Đầu vào (Variables & Body Presets)
- **Giải quyết bài toán kiểm thử nhiều kịch bản:**
  - Trong cùng một môi trường (ví dụ: `Staging`), một API kiểm tra tồn kho cần test với nhiều chi nhánh: Chi nhánh 1 (bình thường), Chi nhánh 2 (hết hàng), Chi nhánh 3 (đóng cửa). Thay vì phải nhân bản ra hàng loạt Environment chỉ để đổi `storeId`, tính năng **Presets** cho phép lưu các bộ JSON payload mẫu gắn liền theo từng Request.
- **Giao diện Điều khiển Tích hợp:**
  - Hiển thị trên thanh Header của ngăn Variables (GraphQL) hoặc Toolbar tab Body (REST `raw JSON`).
  - **Dropdown Preset:** Hiển thị danh sách presets đã lưu, click là dữ liệu lập tức đổ vào Editor, Explorer tự động đồng bộ lại.
  - **Quản lý tại chỗ:** Hỗ trợ nút bút chì ✏️ để đổi tên trực tiếp và nút thùng rác 🗑️ để xóa preset.
  - **Save Preset (Popover Mini):**
    - Nếu là preset mới: Mở popover mini nhập tên và bấm Lưu.
    - Nếu đang ở một preset có sẵn và nội dung JSON bị chỉnh sửa: Popover thông minh cung cấp 2 lựa chọn: *"Cập nhật đè lên [Tên Preset]"* hoặc *"Lưu thành Preset mới..."*.
- **Lưu trữ Bền vững:**
  - Dữ liệu `presets` và `activePresetId` được lưu đồng bộ vĩnh viễn vào file `collections.json` và khôi phục nguyên vẹn khi mở lại tab.

---

### 4.4. Quản lý Môi trường & Động cơ Mẫu (Environment & Template Engine)
- **Cú pháp Biến Môi trường `{{variable}}`:**
  - Hỗ trợ thay thế biến linh hoạt tại URL, Query Params, Path Variables, Headers, Body và GraphQL Variables.
  - Hỗ trợ biến bí mật (Secret Variables): Tự động che giấu bằng dấu chấm `••••••••` trên giao diện, chỉ hiển thị giá trị thực khi click biểu tượng con mắt.
- **Interactive URL Bar & Variable Tooltip:**
  - URL Bar hiển thị các chip biến nổi bật. Khi hover chuột vào chip, một Tooltip trực quan lập tức hiện ra hiển thị: Tên biến, Giá trị phân giải thực tế, Tên môi trường đang kích hoạt, và trạng thái hợp lệ.
- **Cảnh báo Domain Mismatch Guard:**
  - Nếu URL của request trỏ sang một host khác với biến `{{Domain}}` của môi trường đang kích hoạt, URL Bar sẽ hiển thị cảnh báo màu vàng kèm icon cảnh báo nhằm ngăn chặn việc vô tình gửi token bảo mật của môi trường nội bộ sang server bên ngoài.
- **Quản lý Môi trường Chuyên sâu (Environments Manager):**
  - Quản lý danh sách môi trường tại tab riêng trên Sidebar.
  - Hỗ trợ tạo mới, đổi tên, nhân bản môi trường (Duplicate), xóa môi trường, và thêm/bớt từng dòng biến tiện lợi.

---

### 4.5. Quản trị Không gian Làm việc & Collections Đa tầng
- **Cấu trúc Cây Thư mục Không giới hạn (Multi-tier Folders):**
  - Collection chứa các Folder con, Subfolder và Request.
  - Kéo thả hoặc click menu để thêm mới, đổi tên, nhân bản và xóa.
- **Tree Picker Lưu Request Chuyên nghiệp (`SaveRequestModal`):**
  - Cho phép người dùng duyệt cây thư mục trực quan để chọn vị trí lưu request.
  - Có thanh tìm kiếm nhanh thư mục và hiển thị Breadcrumb đường dẫn (`Collection > Folder > Subfolder`).
- **Nhận diện Thay đổi Chưa lưu (Dirty State Tracking):**
  - Sử dụng hàm `createRequestSnapshot()` tạo hash snapshot JSON của các trường trọng yếu khi mở hoặc lưu request.
  - Khi có chỉnh sửa, tab hiển thị dấu chấm tròn cảnh báo `●`.
  - Khi người dùng đóng tab đang dirty, modal `UnsavedChangesModal` sẽ xuất hiện với 3 tùy chọn rõ ràng: **Lưu thay đổi (Save)**, **Không lưu (Don't Save)**, hoặc **Hủy bỏ (Cancel)**.

---

### 4.6. Tiện ích Lập trình viên (Developer Utilities)
- **Nhập cURL Thông minh (Smart cURL Import):**
  - Tự động bóc tách các cURL command phức tạp, hỗ trợ ANSI-C quoting (`$'...'`), đa dòng (`\` hoặc `^`).
  - Tự động nhận diện body cURL là GraphQL query (`{"query": "...", "variables": {...}}`) để chuyển thẳng sang chế độ GraphQL Mode thay vì REST thông thường.
- **Sinh Mã Nguồn Đa Ngôn ngữ (Code Snippet Generator):**
  - Xuất request hiện tại thành mã nguồn sẵn sàng chạy cho các ngôn ngữ:
    - `cURL` (bash)
    - `JavaScript` (Fetch API, Axios)
    - `Node.js` (Native https)
    - `Python` (Requests, http.client)
    - `Go` (net/http)
    - `Dart / Flutter` (http package)
- **Tùy biến Cài đặt Ứng dụng (App Settings):**
  - **Request Timeout:** Tùy chỉnh thời gian chờ (mặc định 60,000 ms). **Đặc biệt hỗ trợ giá trị `0` (vô hạn thời gian)** dành riêng cho lập trình viên khi gắn Breakpoint debug mã nguồn Backend mà không lo bị ngắt kết nối.
  - **Bỏ qua SSL:** Cờ `rejectUnauthorized: false` giúp gọi mượt mà các API HTTPS nội bộ dùng chứng chỉ tự ký.
  - **Phóng to / Thu nhỏ:** Hỗ trợ phím tắt `Ctrl + =`, `Ctrl + -`, `Ctrl + 0` toàn ứng dụng mượt mà.

---

## 5. MÔ HÌNH DỮ LIỆU & LƯU TRỮ BỀN VỮNG

Toàn bộ dữ liệu được lưu trữ trực tiếp dưới dạng file JSON tại thư mục `data/`:

### 5.1. Mô hình Request (`data/collections.json`)

```ts
export interface DataPreset {
  id: string;          // UUID của preset
  name: string;        // Tên kịch bản (VD: "CN Quận 1 - Bình thường")
  content: string;     // Chuỗi JSON stringified của Variables hoặc Body
  createdAt: number;   // Timestamp khởi tạo
}

export interface RequestItem {
  id: string;
  savedRequestId?: string;
  collectionId?: string;
  folderId?: string | null;
  name: string;
  mode: 'REST' | 'GRAPHQL';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  params: KeyValueRow[];
  pathVariables?: KeyValueRow[];
  headersList: KeyValueRow[];
  headersText: string;
  auth: AuthConfig;
  bodyType: 'none' | 'json' | 'form-data' | 'x-www-form-urlencoded' | 'raw';
  restBody: string;
  rawText: string;
  formData: KeyValueRow[];
  urlencoded: KeyValueRow[];
  gqlQuery: string;
  gqlVariables: string;
  preRequestScript?: string;
  testScript: string;
  editorTab: 'PARAMS' | 'HEADERS' | 'AUTH' | 'BODY' | 'VARIABLES' | 'TESTS' | 'SCRIPTS';
  presets?: DataPreset[];
  activePresetId?: string;
  savedSnapshot?: string;
}
```

### 5.2. Mô hình Môi trường (`data/environments.json`)

```ts
export interface EnvironmentVariable {
  id: string;
  key: string;         // Tên biến (VD: "Domain", "token")
  value: string;       // Giá trị thực tế
  enabled: boolean;    // Kích hoạt / Tắt
  secret?: boolean;    // Mặt nạ bảo mật (mask)
}

export interface EnvironmentItem {
  id: string;
  name: string;        // Tên môi trường (VD: "Local", "Staging", "Production")
  variables: EnvironmentVariable[];
}
```

### 5.3. Mô hình Cài đặt & Phiên làm việc (`data/settings.json`)

```ts
export interface AppSettings {
  requestTimeout: number;          // Timeout (ms) hoặc 0 để debug
  rejectUnauthorized: boolean;     // Kiểm tra chứng chỉ SSL
  disableLocalhostTimeout: boolean;// Tự động tắt timeout với localhost
  editorFontSize: number;          // Cỡ chữ CodeMirror
  zoomLevel: number;               // Tỉ lệ zoom ứng dụng
}

export interface PersistedWorkspaceSettings {
  settings: AppSettings;
  activeEnvironmentId: string | null;
  activeTabId: string | null;
  tabs: PersistedRequestItem[];    // Trạng thái các tab đang mở
  splitLayout: 'horizontal' | 'vertical';
  isSidebarCollapsed: boolean;
}
```

---

## 6. HƯỚNG DẪN MÔI TRƯỜNG & QUY TRÌNH VẬN HÀNH

### 6.1. Yêu cầu Tiên quyết (Prerequisites)
- **Hệ điều hành:** Windows 10/11 (x64), macOS (Intel/Apple Silicon), hoặc Linux.
- **Node.js:** Phiên bản `>= 18.16.0` (khuyến nghị Node.js 20 LTS).
- **Trình quản lý gói:** `npm` (phiên bản `>= 9.x`).

### 6.2. Cài đặt Phụ thuộc (Installation)
```bash
# Di chuyển vào thư mục dự án
cd D:/api-dk-lab

# Cài đặt toàn bộ packages
npm install
```

### 6.3. Khởi chạy Chế độ Phát triển (Local Development)
Lệnh sau sẽ khởi chạy Vite Dev Server cho Renderer và kích hoạt tiến trình Electron chạy song song:
```bash
npm run dev
```

### 6.4. Kiểm tra Chất lượng Mã nguồn & Định kiểu (Code Quality & Verification)
Trước khi tạo Pull Request hoặc bàn giao phiên bản mới, bắt buộc thực hiện kiểm tra 100% không lỗi:
```bash
# 1. Kiểm tra tĩnh kiểu dữ liệu TypeScript toàn bộ dự án
npx tsc --noEmit

# 2. Kiểm tra quy chuẩn mã nguồn ESLint
npm run lint
```

### 6.5. Đóng gói Ứng dụng Desktop Độc lập (Production Packaging)
Lệnh build sẽ tuần tự thực hiện: biên dịch TypeScript, đóng gói Renderer qua Vite, biên dịch Main process và gọi `electron-builder` để tạo bộ cài đặt:
```bash
npm run build
```
- **Đầu ra sản phẩm (Output):** Nằm tại thư mục `release/1.0.0/`
  - Bản cài đặt Windows: `API DK Lab-Windows-1.0.0-Setup.exe`
  - Bản chạy portable/unpacked: `release/1.0.0/win-unpacked/API DK Lab.exe`

---

## 7. QUY CHUẨN THIẾT KẾ GIAO DIỆN & HƯỚNG DẪN MỞ RỘNG

### 7.1. Bảng Màu Hệ Thống Chuẩn Mực (Design Tokens)
Ứng dụng sử dụng bảng màu Dark Mode chuyên sâu được định nghĩa tại `src/index.css`:

| Token CSS | Mã Hex / Giá trị | Ý nghĩa & Vị trí Áp dụng |
| :--- | :--- | :--- |
| `--bg-app` | `#0f1117` | Màu nền gốc của ứng dụng |
| `--bg-sidebar` | `#161822` | Nền thanh Sidebar và thanh Tabs tiêu đề |
| `--bg-panel` | `#13151f` | Nền không gian soạn thảo chính và bảng dữ liệu |
| `--bg-card` | `#1a1d2b` | Nền của thẻ, card, dropdown menu, modal popover |
| `--bg-input` | `#1e2230` | Nền của các ô nhập liệu văn bản, input form |
| `--border` | `#2a2f42` | Đường viền chính phân định các panel |
| `--border-subtle`| `#212536` | Đường kẻ phân cách nhẹ giữa các hàng |
| `--text-primary`| `#e2e8f0` | Màu chữ chính, tiêu đề (độ tương phản cao) |
| `--text-muted`  | `#94a3b8` | Màu chữ phụ, ghi chú, icon nhạt |
| `--primary`     | `#3b82f6` | Màu xanh công nghệ chủ đạo (Action Buttons, Active State) |
| `--success`     | `#10b981` | Trạng thái thành công, HTTP 2xx, Test Pass |
| `--warning`     | `#f59e0b` | Trạng thái cảnh báo, Dirty dot, Domain Mismatch |
| `--danger`      | `#ef4444` | Trạng thái lỗi cú pháp, HTTP 4xx/5xx, Test Fail |

---

### 7.2. Hướng dẫn Mở rộng Tính năng (Extension Guidelines)

#### A. Thêm một Ngôn ngữ Xuất mã nguồn mới (Code Generator)
1. Mở file [`src/utils/codeGenerators.ts`](file:///D:/api-dk-lab/src/utils/codeGenerators.ts).
2. Thêm định danh mới vào kiểu `CodeSnippetLang` (ví dụ: `'ruby_net_http'`).
3. Khai báo item mới trong mảng `CODE_SNIPPET_OPTIONS`.
4. Bổ sung nhánh `case` tương ứng trong hàm `generateCodeSnippet()`, sử dụng `getRequestBodyString(request, environment)` và `getResolvedHeaders(request, environment)` đã được tự động làm sạch trailing commas.

#### B. Thêm một Kênh Giao tiếp IPC An toàn mới
1. Mở file [`electron/preload.ts`](file:///D:/api-dk-lab/electron/preload.ts):
   - Bổ sung tên channel vào tập hợp `allowedInvokeChannels` (ví dụ: `'custom:feature'`).
   - Khai báo method tương ứng trong `contextBridge.exposeInMainWorld('desktopApi', {...})`.
2. Mở file [`electron/main.ts`](file:///D:/api-dk-lab/electron/main.ts):
   - Đăng ký handler xử lý: `ipcMain.handle('custom:feature', async (_event, args) => { ... })`.
3. Mở file [`src/vite-env.d.ts`](file:///D:/api-dk-lab/src/vite-env.d.ts):
   - Khai báo kiểu dữ liệu của method mới trong interface `DesktopApi`.

#### C. Nguyên tắc Kiến trúc Bắt buộc (Architectural Guardrails)
- **Không đưa thư viện nặng vào UI bundle:** Tránh cài đặt các parser cồng kềnh phía client nếu có thể giải quyết bằng pure TypeScript.
- **Giữ tính toàn vẹn của JSON Storage:** Mọi thao tác ghi dữ liệu xuống `data/` bắt buộc phải đi qua các hàm chuẩn hóa của `storageService.ts`, luôn bọc trong khối `try...catch` và tạo snapshot phục vụ dirty state tracking.
- **Tuân thủ Clean Component:** Tuyệt đối không tạo các file component quá 800 dòng lệnh; chủ động tách nhỏ các logic con thành custom hooks hoặc sub-components tại `components/request/` hoặc `components/common/`.
