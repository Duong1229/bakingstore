<template>
  <div class="admin-shell">
    <aside :class="['sidebar', { open: isSidebarOpen }]">
      <div class="brand">TIỆM ỐC<small>QUẢN TRỊ BÁN HÀNG</small></div>
      <button
        v-for="item in visibleMenu"
        :key="item.id"
        :class="{ active: tab === item.id }"
        @click="
          openTab(item.id);
          isSidebarOpen = false;
        "
      >
        <span>{{ item.icon }}</span
        >{{ item.name }}
      </button>
      <button class="sidebar-logout" @click="logout">↪ Đăng xuất</button>
    </aside>
    <div
      v-if="isSidebarOpen"
      class="sidebar-mask"
      @click="isSidebarOpen = false"
    ></div>
    <main>
      <header>
        <div class="header-title">
          <button class="menu-toggle" @click="isSidebarOpen = true">☰</button>
          <div>
            <p>Tiệm Ốc · Quản trị cửa hàng</p>
            <h1>{{ title }}</h1>
          </div>
        </div>
        <div class="header-actions">
          <button class="admin-profile" @click="router.push('/account')">
            <img
              v-if="authStore.user?.avatar_url"
              :src="authStore.user.avatar_url"
              alt="Ảnh đại diện"
            />
            <span v-else>👤</span> {{ authStore.user?.full_name }}</button
          ><button @click="logout">Đăng xuất</button>
        </div>
      </header>
      <p v-if="error" class="error">{{ error }}</p>

      <template v-if="tab === 'dashboard'">
        <div class="metrics">
          <button class="metric-card" @click="openTab('orders')">
            <span>💰</span><small>Doanh thu hôm nay</small
            ><strong>{{ money(dashboard.revenue?.today) }}</strong
            ><em>Xem đơn hàng →</em></button
          ><button class="metric-card" @click="openTab('revenue')">
            <span>📅</span><small>Doanh thu tháng này</small
            ><strong>{{ money(dashboard.revenue?.this_month) }}</strong
            ><em>Xem báo cáo →</em></button
          ><button class="metric-card" @click="openTab('orders')">
            <span>🧾</span><small>Đơn hàng hôm nay</small
            ><strong>{{ dashboard.orders?.today_total || 0 }}</strong
            ><em>Xem đơn hàng →</em></button
          ><button class="metric-card" @click="openTab('inventory')">
            <span>⚠️</span><small>Lô sắp hết hạn</small
            ><strong>{{
              dashboard.inventory?.expiring_soon?.length || 0
            }}</strong
            ><em>Xem kho →</em>
          </button>
        </div>
        <section>
          <h2>Đơn hàng mới nhất</h2>
          <Table :cols="orderCols" :rows="dashboard.orders?.recent || []" />
        </section>
      </template>

      <template v-else-if="tab === 'revenue'"
        ><section class="revenue-report">
          <div class="heading">
            <div>
              <h2>Báo cáo doanh thu</h2>
              <p>Lọc theo kỳ, ngày và phương thức thanh toán để đối soát.</p>
            </div>
            <button @click="loadRevenue">↻ Làm mới</button>
          </div>
          <div class="report-filters">
            <select v-model="reportFilter.period" @change="resetDates">
              <option value="day">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="year">Năm nay</option>
              <option value="custom">Khoảng thời gian</option></select
            ><select v-model="reportFilter.payment_method">
              <option value="all">Tất cả thanh toán</option>
              <option value="cash">Tiền mặt</option>
              <option value="vietqr">Chuyển khoản VietQR</option></select
            ><input
              v-if="reportFilter.period === 'custom'"
              v-model="reportFilter.start_date"
              type="date"
            /><input
              v-if="reportFilter.period === 'custom'"
              v-model="reportFilter.end_date"
              type="date"
            /><button @click="loadRevenue">Áp dụng</button>
          </div>
          <div class="revenue-summary">
            <article>
              <small>Tổng doanh thu</small
              ><strong>{{
                money(revenueReport.summary?.total_revenue)
              }}</strong>
            </article>
            <article>
              <small>Số đơn trong kỳ</small
              ><strong>{{ revenueReport.summary?.total_orders || 0 }}</strong>
            </article>
            <article>
              <small>Giá trị đơn trung bình</small
              ><strong>{{
                money(revenueReport.summary?.avg_order_value)
              }}</strong>
            </article>
          </div>
          <div class="report-grid">
            <div class="chart-card">
              <h3>Doanh thu theo thời gian</h3>
              <p v-if="!revenueSeries.length" class="empty">
                Chưa có đơn trong kỳ này.
              </p>
              <div v-else class="bar-chart">
                <div
                  v-for="point in revenueSeries"
                  :key="point.label"
                  class="bar-column"
                >
                  <span class="bar-value">{{ money(point.amount) }}</span>
                  <div class="bar-track">
                    <i
                      :style="{
                        height: `${Math.max(8, Math.round((point.amount / maxRevenue) * 100))}%`,
                      }"
                    ></i>
                  </div>
                  <small>{{ point.label }}</small>
                </div>
              </div>
            </div>
            <div class="chart-card">
              <h3>Doanh thu theo phương thức</h3>
              <div class="payment-bars">
                <div
                  v-for="item in revenueReport.by_payment || []"
                  :key="item.method"
                >
                  <span>{{
                    item.method === "cash" ? "Tiền mặt" : "VietQR"
                  }}</span
                  ><b>{{ money(item.amount) }}</b
                  ><i
                    :style="{
                      width: `${Math.round((item.amount / maxPaymentRevenue) * 100)}%`,
                    }"
                  ></i>
                </div>
              </div>
            </div>
          </div>
          <div class="chart-card">
            <h3>Sản phẩm bán trong kỳ</h3>
            <Table
              :cols="reportProductCols"
              :rows="revenueReport.product_stats || []"
            />
          </div></section
      ></template>

      <section v-else-if="tab === 'reviews'" class="review-management">
        <div class="heading">
          <div>
            <h2>Đánh giá khách hàng</h2>
            <p>Xem nhận xét và phản hồi trực tiếp với khách hàng.</p>
          </div>
          <button @click="loadStoreReviews">↻ Làm mới</button>
        </div>
        <input
          v-model.trim="reviewSearch"
          class="review-search"
          placeholder="Tìm sản phẩm, khách hàng hoặc nội dung đánh giá..."
        />
        <p v-if="!filteredStoreReviews.length" class="empty">
          Chưa có đánh giá phù hợp.
        </p>
        <article
          v-for="review in filteredStoreReviews"
          :key="review.id"
          class="store-review-card"
        >
          <header>
            <div>
              <b>{{ review.products?.name || "Sản phẩm" }}</b
              ><small
                >{{ review.products?.sku || "" }} ·
                {{ review.customer_name }}</small
              >
            </div>
            <span class="admin-review-stars"
              >{{ "★".repeat(review.rating)
              }}<i>{{ "★".repeat(5 - review.rating) }}</i></span
            >
          </header>
          <p class="customer-review">
            {{ review.comment || "Khách hàng không để lại nhận xét bằng chữ." }}
          </p>
          <small class="review-date"
            >Đánh giá lúc
            {{ new Date(review.created_at).toLocaleString("vi-VN") }}</small
          >
          <div class="reply-box">
            <label
              >{{
                review.response_comment
                  ? "Chỉnh sửa phản hồi của cửa hàng"
                  : "Phản hồi với khách hàng"
              }}<textarea
                v-model.trim="review.response_draft"
                maxlength="2000"
                placeholder="Cảm ơn khách hàng hoặc giải đáp vấn đề của khách..."
              ></textarea>
            </label>
            <div>
              <small v-if="review.responded_at"
                >Phản hồi gần nhất:
                {{ review.responder_name || "Nhân viên cửa hàng" }} ·
                {{
                  new Date(review.responded_at).toLocaleString("vi-VN")
                }}</small
              ><button @click="saveReviewResponse(review)">
                {{ review.response_comment ? "Lưu chỉnh sửa" : "Gửi phản hồi" }}
              </button>
            </div>
          </div>
        </article>
      </section>

      <section v-else-if="tab === 'messages'" class="support-admin">
        <div class="heading">
          <div>
            <h2>Tin nhắn khách hàng</h2>
            <p>Trao đổi trực tiếp và hỗ trợ khách hàng đã đăng nhập.</p>
          </div>
          <button @click="loadConversations">↻ Làm mới</button>
        </div>
        <div class="conversation-layout">
          <aside>
            <input
              v-model.trim="conversationSearch"
              placeholder="Tìm khách hàng..."
            /><button
              v-for="conversation in filteredConversations"
              :key="conversation.customer.id"
              :class="{
                active:
                  selectedConversation?.customer.id ===
                  conversation.customer.id,
              }"
              @click="selectedConversation = conversation"
            >
              <b>{{ conversation.customer.full_name }}</b
              ><small>{{
                conversation.messages.at(-1)?.content || "Chưa có tin nhắn"
              }}</small>
            </button>
            <p v-if="!filteredConversations.length" class="empty">
              Chưa có tin nhắn.
            </p>
          </aside>
          <div v-if="selectedConversation" class="conversation-main">
            <header>
              <b>Đang trò chuyện với: {{ selectedConversation.customer.full_name }}</b
              ><small>{{
                selectedConversation.customer.phone ||
                selectedConversation.customer.email ||
                ""
              }}</small>
            </header>
            <div class="admin-messages">
              <div
                v-for="message in selectedConversation.messages"
                :key="message.id"
                :class="[
                  'admin-bubble',
                  message.sender_id === selectedConversation.customer.id
                    ? 'from-customer'
                    : 'from-store',
                ]"
              >
                <span v-if="message.content">{{ message.content }}</span><router-link v-if="message.product" :to="`/product/${message.product.slug || message.product.id}`" class="admin-shared-product"><img :src="message.product.image_url || fallbackImage" :alt="message.product.name"><span><b>{{ message.product.name }}</b><small>{{ money(message.product.price) }} / {{ message.product.unit || 'gói' }}</small></span></router-link><small>{{ message.sender_id === selectedConversation.customer.id ? `Khách: ${selectedConversation.customer.full_name}` : 'Tiệm Ốc' }} · {{ new Date(message.created_at).toLocaleString("vi-VN") }}</small>
              </div>
            </div>
            <form @submit.prevent="sendAdminReply">
              <textarea
                v-model.trim="adminReplyDraft"
                maxlength="2000"
                placeholder="Nhập phản hồi cho khách hàng..."
              ></textarea
              ><button :disabled="!adminReplyDraft">Gửi phản hồi</button>
            </form>
          </div>
          <div v-else class="conversation-empty">
            Chọn một khách hàng để xem cuộc trò chuyện.
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'sales'" class="sales">
        <div>
          <h2>Bán hàng tại quầy</h2>
          <p>
            Tạo đơn, thanh toán và in hóa đơn cho khách mua trực tiếp tại cửa
            hàng.
          </p>
        </div>
        <router-link to="/pos">Mở POS Quầy →</router-link>
      </section>

      <section v-else>
        <div class="heading">
          <div>
            <h2>{{ title }}</h2>
            <p>{{ description }}</p>
          </div>
          <button v-if="tab === 'inventory'" @click="loadInventory">
            ↻ Làm mới
          </button>
        </div>
        <form
          v-if="tab === 'inventory'"
          class="manual-batch"
          @submit.prevent="saveManualBatch"
        >
          <div class="inventory-form-title">
            <b>{{
              editingBatch
                ? "Điều chỉnh lô hàng sau kiểm kho"
                : "Nhập kho thủ công"
            }}</b
            ><small>{{
              editingBatch
                ? "Cập nhật số lượng thực tế hoặc thông tin lô, sau đó bấm Lưu điều chỉnh."
                : "Tạo lô hàng mới để số lượng được cộng vào tồn kho bán hàng."
            }}</small>
          </div>
          <label
            >Sản phẩm<select v-model="manualBatch.product_id" required>
              <option value="" disabled>Chọn sản phẩm nhập kho</option>
              <option
                v-for="item in inventoryProducts"
                :key="item.id"
                :value="item.id"
              >
                {{ item.name }} · {{ item.sku }}
              </option>
            </select></label
          >
          <label
            >Mã lô<input
              v-model.trim="manualBatch.batch_code"
              placeholder="Ví dụ: LO-2026-001"
              required
          /></label>
          <label
            >Ngày sản xuất / nhập<input
              v-model="manualBatch.manufacture_date"
              type="date"
          /></label>
          <label
            >Hạn sử dụng<input
              v-model="manualBatch.expiry_date"
              type="date"
              required
          /></label>
          <label
            >{{ editingBatch ? "Số lượng còn thực tế" : "Số lượng nhập"
            }}<input
              v-model.number="manualBatch.quantity"
              type="number"
              min="0"
              required
          /></label>
          <label
            >Giá nhập / đơn vị<input
              v-model.number="manualBatch.import_price"
              type="number"
              min="0"
          /></label>
          <div class="batch-form-actions">
            <button type="submit">
              {{ editingBatch ? "Lưu điều chỉnh" : "Lưu lô hàng" }}</button
            ><button
              v-if="editingBatch"
              type="button"
              class="secondary"
              @click="cancelBatchEdit"
            >
              Hủy chỉnh sửa
            </button>
          </div>
          <p v-if="batchSaveMessage" class="batch-save-message">
            {{ batchSaveMessage }}
          </p>
        </form>
        <template v-if="tab === 'customers' || tab === 'employees'">
          <div class="user-toolbar">
            <button
              v-if="authStore.isAdmin || tab === 'customers'"
              @click="openUserForm"
            >
              ＋ Thêm
              {{ tab === "customers" ? "khách hàng" : "nhân viên" }}</button
            ><input
              v-model.trim="userSearch"
              placeholder="Tìm tên, email, số điện thoại..."
            /><select v-model="userRoleFilter">
              <option value="">Tất cả vai trò</option>
              <template v-if="tab === 'employees'"
                ><option value="staff">Nhân viên</option>
                <option value="admin">Quản trị viên</option></template
              >
              <option v-else value="customer">Khách hàng</option>
            </select>
          </div>
          <div class="product-table-wrap">
            <table class="product-table">
              <thead>
                <tr>
                  <th>Họ tên</th>
                  <th>Email</th>
                  <th>Điện thoại</th>
                  <th>Vai trò</th>
                  <th>Trạng thái</th>
                  <th v-if="authStore.isAdmin || tab === 'customers'">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in filteredUsers" :key="user.id">
                  <td>
                    <b>{{ user.full_name }}</b>
                  </td>
                  <td>{{ user.email }}</td>
                  <td>{{ user.phone || "-" }}</td>
                  <td>
                    <span class="tag">{{ user.role }}</span>
                  </td>
                  <td>
                    <span
                      :class="['state', user.is_active ? 'active' : 'inactive']"
                      >{{ user.is_active ? "Hoạt động" : "Đã khóa" }}</span
                    >
                  </td>
                  <td v-if="authStore.isAdmin || tab === 'customers'">
                    <button class="edit-button" @click="editUser(user)">
                      Sửa</button
                    ><button class="delete-button" @click="toggleUser(user)">
                      {{
                        authStore.isAdmin
                          ? user.is_active
                            ? "Khóa"
                            : "Mở khóa"
                          : "Xóa"
                      }}
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredUsers.length">
                  <td
                    :colspan="authStore.isAdmin || tab === 'customers' ? 6 : 5"
                    class="empty"
                  >
                    Không tìm thấy người dùng.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="showUserForm"
            class="modal-backdrop"
            @click.self="showUserForm = false"
          >
            <form class="product-form" @submit.prevent="saveUser">
              <h3>{{ editingUser ? "Sửa tài khoản" : "Thêm tài khoản" }}</h3>
              <label
                >Họ tên<input
                  v-model.trim="userForm.full_name"
                  required /></label
              ><label
                >Email<input
                  v-model.trim="userForm.email"
                  type="email"
                  required
                  :disabled="!!editingUser" /></label
              ><label>Điện thoại<input v-model.trim="userForm.phone" /></label
              ><label v-if="!editingUser"
                >Mật khẩu đăng nhập<input
                  v-model="userForm.password"
                  type="password"
                  required
                  minlength="6"
                  placeholder="Ít nhất 6 ký tự" /></label
              ><label
                >Vai trò<select v-model="userForm.role">
                  <template v-if="tab === 'employees'"
                    ><option value="staff">Nhân viên</option>
                    <option value="admin">Quản trị viên</option></template
                  >
                  <option v-else value="customer">Khách hàng</option>
                </select></label
              >
              <div class="form-actions">
                <button type="button" @click="showUserForm = false">Hủy</button
                ><button type="submit">Lưu</button>
              </div>
            </form>
          </div>
        </template>
        <template
          v-else-if="
            ['categories', 'banners', 'suppliers', 'vouchers'].includes(tab)
          "
        >
          <div class="user-toolbar">
            <button @click="openEntityForm()">
              ＋ Thêm {{ title.toLowerCase() }}</button
            ><input v-model.trim="entitySearch" placeholder="Tìm kiếm..." />
          </div>
          <div class="product-table-wrap">
            <table class="product-table">
              <thead>
                <tr>
                  <th v-for="field in entityTableFields" :key="field.key">
                    {{ field.label }}
                  </th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in filteredEntities" :key="row.id">
                  <td v-for="field in entityTableFields" :key="field.key">
                    {{ formatEntityValue(row, field.key) }}
                  </td>
                  <td>
                    <button class="edit-button" @click="openEntityForm(row)">
                      ✎ Sửa</button
                    ><button class="delete-button" @click="removeEntity(row)">
                      Xóa
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredEntities.length">
                  <td :colspan="entityTableFields.length + 1" class="empty">
                    Không tìm thấy dữ liệu.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="showEntityForm"
            class="modal-backdrop"
            @click.self="showEntityForm = false"
          >
            <form class="product-form" @submit.prevent="saveEntity">
              <h3>
                {{ editingEntity ? "Chỉnh sửa" : "Thêm mới" }}
                {{ title.toLowerCase() }}
              </h3>
              <template v-for="field in entityFields" :key="field.key"
                ><label v-if="field.key !== 'image_url'"
                  >{{ field.label
                  }}<select
                    v-if="field.type === 'select'"
                    v-model="entityForm[field.key]"
                    :required="field.required"
                  >
                    <option
                      v-for="option in field.options"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </option></select
                  ><textarea
                    v-else-if="field.type === 'textarea'"
                    v-model.trim="entityForm[field.key]"
                  ></textarea
                  ><input
                    v-else
                    v-model="entityForm[field.key]"
                    :type="field.type || 'text'"
                    :required="field.required"
                    :min="field.min"
                /></label>
                <div v-else class="image-picker wide">
                  <b>{{ field.label }}</b>
                  <div class="image-picker-actions">
                    <label class="file-button"
                      >Chọn ảnh từ máy<input
                        type="file"
                        accept="image/*"
                        @change="selectEntityImage" /></label
                    ><label class="file-button secondary"
                      >Chụp ảnh<input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        @change="selectEntityImage" /></label
                    ><button
                      v-if="entityForm.image_url"
                      type="button"
                      class="remove-image"
                      @click="entityForm.image_url = ''"
                    >
                      Gỡ ảnh
                    </button>
                  </div>
                  <small>{{
                    tab === "banners"
                      ? "Nên dùng ảnh ngang tỷ lệ 3:1, tối đa 2 MB."
                      : "Hỗ trợ JPG, PNG, WebP (tối đa 2 MB)."
                  }}</small
                  ><img
                    v-if="entityForm.image_url"
                    :src="entityForm.image_url"
                    :alt="
                      tab === 'banners'
                        ? 'Xem trước banner'
                        : 'Xem trước ảnh danh mục'
                    "
                    class="image-preview"
                  /></div></template
              ><label
                v-if="tab === 'vouchers' || tab === 'banners'"
                class="check"
                ><input v-model="entityForm.is_active" type="checkbox" />
                {{
                  tab === "banners"
                    ? "Đang hiển thị trên trang chủ"
                    : "Đang hoạt động"
                }}</label
              >
              <div class="form-actions">
                <button type="button" @click="showEntityForm = false">
                  Hủy</button
                ><button type="submit">Lưu</button>
              </div>
            </form>
          </div>
        </template>
        <template v-else-if="tab === 'products'">
          <div class="product-toolbar">
            <button @click="openProductForm()">＋ Thêm sản phẩm</button
            ><select v-model="productType">
              <option value="all">Loại: Tất cả</option>
              <option value="regular">Sản phẩm thường</option>
              <option value="combo">Set combo</option></select
            ><select v-model="productState">
              <option value="all">Trạng thái: Tất cả</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng kinh doanh</option></select
            ><input
              v-model.trim="productSearch"
              placeholder="Tìm tên hoặc SKU..."
            />
          </div>
          <div class="product-table-wrap">
            <table class="product-table">
              <thead>
                <tr>
                  <th>Ảnh</th>
                  <th>SKU</th>
                  <th>Tên sản phẩm</th>
                  <th>Loại</th>
                  <th>Trạng thái</th>
                  <th>Giá bán</th>
                  <th>Danh mục</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in filteredAdminProducts" :key="product.id">
                  <td>
                    <img
                      :src="product.image_url || fallbackImage"
                      :alt="product.name"
                    />
                  </td>
                  <td>{{ product.sku }}</td>
                  <td>
                    <button
                      class="product-name"
                      @click="openProductForm(product)"
                    >
                      {{ product.name }}
                    </button>
                  </td>
                  <td>
                    <span class="tag">{{
                      product.is_combo ? "Set combo" : "Thường"
                    }}</span>
                  </td>
                  <td>
                    <span
                      :class="[
                        'state',
                        product.is_active ? 'active' : 'inactive',
                      ]"
                      >{{ product.is_active ? "Hoạt động" : "Ngừng KD" }}</span
                    >
                  </td>
                  <td>{{ money(product.price) }}</td>
                  <td>{{ product.categories?.name || "-" }}</td>
                  <td>
                    <button
                      class="edit-button"
                      @click="openProductForm(product)"
                    >
                      ✎ Sửa</button
                    ><button
                      class="history-button"
                      @click="openPriceHistory(product)"
                    >
                      Lịch sử giá</button
                    ><button
                      class="delete-button"
                      @click="removeProduct(product)"
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredAdminProducts.length">
                  <td colspan="8" class="empty">Không tìm thấy sản phẩm.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div
            v-if="showProductForm"
            class="modal-backdrop"
            @click.self="showProductForm = false"
          >
            <form class="product-form" @submit.prevent="saveProduct">
              <h3>
                {{
                  editingProduct?.id ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm"
                }}
              </h3>
              <label
                >Tên sản phẩm<input
                  v-model.trim="productForm.name"
                  required /></label
              ><label
                >SKU<input v-model.trim="productForm.sku" required /></label
              ><label
                >Danh mục<select v-model="productForm.category_id" required>
                  <option disabled value="">Chọn danh mục</option>
                  <option
                    v-for="category in categories"
                    :key="category.id"
                    :value="category.id"
                  >
                    {{ category.name }}
                  </option>
                </select></label
              ><label
                >Giá bán<input
                  v-model.number="productForm.price"
                  type="number"
                  min="0"
                  required /></label
              ><label
                >Đơn vị<input
                  v-model.trim="productForm.unit"
                  placeholder="gói, hộp, kg..."
              /></label>
              <div class="image-picker wide">
                <b>Ảnh sản phẩm</b>
                <div class="image-picker-actions">
                  <label class="file-button"
                    >Chọn ảnh từ máy<input
                      type="file"
                      accept="image/*"
                      @change="selectProductImage" /></label
                  ><label class="file-button secondary"
                    >Chụp ảnh<input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      @change="selectProductImage" /></label
                  ><button
                    v-if="productForm.image_url"
                    type="button"
                    class="remove-image"
                    @click="productForm.image_url = ''"
                  >
                    Gỡ ảnh
                  </button>
                </div>
                <small
                  >Hỗ trợ JPG, PNG, WebP (tối đa 2 MB). Ảnh hiện tại vẫn được
                  giữ nếu bạn không chọn ảnh mới.</small
                ><img
                  v-if="productForm.image_url"
                  :src="productForm.image_url"
                  alt="Xem trước ảnh sản phẩm"
                  class="image-preview"
                />
              </div>
              <label class="wide"
                >Mô tả sản phẩm / cách dùng<textarea
                  v-model.trim="productForm.description"
                  placeholder="Mô tả nguyên liệu, quy cách, cách bảo quản và cách sử dụng..."
                ></textarea></label
              ><label class="check"
                ><input v-model="productForm.is_combo" type="checkbox" /> Là set
                combo</label
              ><label class="check"
                ><input v-model="productForm.is_active" type="checkbox" /> Đang
                hoạt động</label
              >
              <div class="form-actions">
                <button type="button" @click="showProductForm = false">
                  Hủy</button
                ><button type="submit">Lưu sản phẩm</button>
              </div>
            </form>
          </div>
          <div
            v-if="showPriceHistory"
            class="modal-backdrop"
            @click.self="showPriceHistory = false"
          >
            <div class="product-form history-modal">
              <h3>Lịch sử giá: {{ historyProduct?.name }}</h3>
              <p v-if="!priceHistory.length" class="empty">
                Chưa có lần thay đổi giá nào.
              </p>
              <table v-else>
                <thead>
                  <tr>
                    <th>Thời điểm</th>
                    <th>Giá cũ</th>
                    <th>Giá mới</th>
                    <th>Người chỉnh</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in priceHistory" :key="item.id">
                    <td>
                      {{ new Date(item.changed_at).toLocaleString("vi-VN") }}
                    </td>
                    <td>{{ money(item.old_price) }}</td>
                    <td>{{ money(item.new_price) }}</td>
                    <td>{{ item.users?.full_name || "Quản trị viên" }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="form-actions">
                <button type="button" @click="showPriceHistory = false">
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </template>
        <div v-else-if="tab === 'orders'" class="product-table-wrap">
          <table class="product-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Khách hàng</th>
                <th>Loại đơn</th>
                <th>Thanh toán</th>
                <th>Tổng tiền</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="order in orders" :key="order.id">
                <td>
                  <button class="product-name" @click="openOrder(order)">
                    {{ order.order_code }}
                  </button>
                </td>
                <td>
                  {{
                    order.users?.full_name ||
                    order.recipient_name ||
                    "Khách tại quầy"
                  }}
                </td>
                <td>{{ order.order_type }}</td>
                <td>{{ order.payment_method || "-" }}</td>
                <td>{{ money(order.final_amount) }}</td>
                <td>
                  <span class="tag">{{ order.order_status }}</span>
                </td>
                <td>
                  <select
                    :value="order.pending_status || order.order_status"
                    @change="order.pending_status = $event.target.value"
                  >
                    <option value="pending">Chờ xác nhận</option>
                    <option value="confirmed">Đã xác nhận</option>
                    <option value="picking">Đang soạn hàng</option>
                    <option value="cancellation_requested">
                      Yêu cầu hủy — chờ duyệt
                    </option>
                    <option value="shipping">Đang giao</option>
                    <option value="completed">Hoàn thành</option>
                    <option value="cancelled">
                      Chấp nhận hủy / Đã hủy
                    </option></select
                  ><button
                    class="edit-button"
                    @click="
                      changeOrderStatus(
                        order,
                        order.pending_status || order.order_status,
                      )
                    "
                  >
                    Lưu
                  </button>
                </td>
              </tr>
              <tr v-if="!orders.length">
                <td colspan="7" class="empty">Chưa có đơn hàng.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <template v-else-if="tab === 'inventory'"
          ><div class="notice">
            Tồn kho được tính từ các lô còn hoạt động. Khi khách đặt hàng thành
            công, số lượng lô sẽ tự giảm theo nguyên tắc hạn gần nhất trước.
          </div>
          <div class="inventory-actions">
            <button type="button" @click="downloadInventoryTemplate">
              ⇩ Tải mẫu Excel</button
            ><label
              >⇧ Nhập kho từ Excel<input
                type="file"
                accept=".xlsx,.xls"
                @change="importExcel"
            /></label>
          </div>
          <article v-if="importResult" class="import-result" role="status">
            <div>
              <b>{{
                importResult.type === "disposal"
                  ? "✓ Phiếu xuất tiêu hủy đã sẵn sàng"
                  : importResult.success
                    ? "✓ Nhập kho Excel hoàn tất"
                    : "⚠ Nhập kho Excel cần kiểm tra"
              }}</b>
              <p>{{ importMessage }}</p>
            </div>
            <button
              type="button"
              @click="importResult = null"
              aria-label="Đóng thông báo"
            >
              ×
            </button>
            <ul v-if="importResult.errors?.length">
              <li
                v-for="issue in importResult.errors.slice(0, 5)"
                :key="`${issue.row}-${issue.message}`"
              >
                {{ issue.message }}
              </li>
            </ul>
            <small v-if="importResult.errors?.length > 5"
              >Còn {{ importResult.errors.length - 5 }} dòng lỗi khác trong
              tệp.</small
            >
          </article>
          <h3>Tồn kho theo sản phẩm</h3>
          <Table :cols="stockCols" :rows="stock" />
          <div class="batch-list-heading">
            <div>
              <h3>Danh sách lô hàng</h3>
              <p>
                Tích các lô đã hết hạn để lập một phiếu xuất tiêu hủy chung.
              </p>
            </div>
            <div class="batch-selection-actions">
              <b v-if="selectedExpiredBatchIds.length"
                >Đã chọn {{ selectedExpiredBatchIds.length }} lô</b
              ><button
                type="button"
                :disabled="!selectedExpiredBatchIds.length"
                @click="exportSelectedDisposals('xlsx')"
              >
                ⇩ Xuất Excel</button
              ><button
                type="button"
                :disabled="!selectedExpiredBatchIds.length"
                @click="exportSelectedDisposals('pdf')"
              >
                ⇩ Xuất PDF</button
              ><input
                v-model.trim="batchSearch"
                placeholder="Tìm mã lô, SKU hoặc tên sản phẩm..."
              />
            </div>
          </div>
          <div class="product-table-wrap">
            <table class="product-table">
              <thead>
                <tr>
                  <th>Chọn</th>
                  <th>Mã lô</th>
                  <th>Sản phẩm</th>
                  <th>Ngày nhập</th>
                  <th>Hạn sử dụng</th>
                  <th>Số lượng còn</th>
                  <th>Giá nhập</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="batch in filteredBatches" :key="batch.id">
                  <td>
                    <input
                      v-if="canDispose(batch)"
                      type="checkbox"
                      :checked="selectedExpiredBatchIds.includes(batch.id)"
                      @change="
                        toggleExpiredBatch(batch.id, $event.target.checked)
                      "
                      aria-label="Chọn lô để xuất tiêu hủy"
                    /><span v-else>—</span>
                  </td>
                  <td>
                    <b>{{ batch.batch_code }}</b>
                  </td>
                  <td>
                    {{ batch.products?.name || "-"
                    }}<small class="cell-sub">{{
                      batch.products?.sku || "-"
                    }}</small>
                  </td>
                  <td>
                    {{
                      batch.manufacture_date ||
                      batch.created_at?.slice(0, 10) ||
                      "-"
                    }}
                  </td>
                  <td :class="{ 'expired-date': isExpired(batch) }">
                    {{ batch.expiry_date }}
                  </td>
                  <td>
                    <b>{{ batch.current_quantity }}</b>
                    {{ batch.products?.unit || "" }}
                  </td>
                  <td>{{ money(batch.import_price) }}</td>
                  <td>
                    <span
                      :class="['tag', { 'expired-tag': isExpired(batch) }]"
                      >{{ batchStatus(batch) }}</span
                    >
                  </td>
                  <td>
                    <button
                      v-if="canDispose(batch)"
                      class="dispose-button"
                      @click="disposeExpiredBatch(batch)"
                    >
                      {{
                        Number(batch.current_quantity) > 0
                          ? "Xuất tiêu hủy"
                          : "Tải lại phiếu"
                      }}</button
                    ><button class="edit-button" @click="editBatch(batch)">
                      Sửa</button
                    ><button class="delete-button" @click="removeBatch(batch)">
                      Xóa
                    </button>
                  </td>
                </tr>
                <tr v-if="!filteredBatches.length">
                  <td colspan="9" class="empty">
                    Không tìm thấy lô hàng phù hợp.
                  </td>
                </tr>
              </tbody>
            </table>
          </div></template
        >
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, h, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "../stores/auth";
import {
  adminApi,
  bannerApi,
  inventoryApi,
  orderApi,
  productApi,
  supportChatApi,
} from "../api";

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const tab = ref("dashboard");
const dashboard = ref({});
const revenueReport = ref({});
const customers = ref([]);
const employees = ref([]);
const categories = ref([]);
const products = ref([]);
const suppliers = ref([]);
const orders = ref([]);
const vouchers = ref([]);
const banners = ref([]);
const stock = ref([]);
const batches = ref([]);
const storeReviews = ref([]);
const conversations = ref([]),
  selectedConversation = ref(null);
const error = ref("");
const isSidebarOpen = ref(false),
  importMessage = ref(""),
  importResult = ref(null),
  batchSaveMessage = ref("");
const userSearch = ref(""),
  userRoleFilter = ref(""),
  entitySearch = ref(""),
  batchSearch = ref(""),
  reviewSearch = ref(""),
  conversationSearch = ref(""),
  adminReplyDraft = ref(""),
  editingBatch = ref(null);
const productSearch = ref(""),
  productType = ref("all"),
  productState = ref("all"),
  showProductForm = ref(false),
  editingProduct = ref(null),
  showEntityForm = ref(false),
  editingEntity = ref(null),
  showUserForm = ref(false),
  editingUser = ref(null),
  showPriceHistory = ref(false),
  historyProduct = ref(null),
  priceHistory = ref([]);
const fallbackImage =
  "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=150&q=80";
const blankProduct = () => ({
  name: "",
  sku: "",
  category_id: "",
  price: 0,
  unit: "gói",
  image_url: "",
  description: "",
  is_combo: false,
  is_active: true,
});
const productForm = ref(blankProduct());
const blankUser = (role = "customer") => ({
  full_name: "",
  email: "",
  phone: "",
  password: "",
  role,
});
const userForm = ref(blankUser());
const entityForm = ref({});
const selectedExpiredBatchIds = ref([]);
const menu = [
  { id: "dashboard", name: "Tổng quan", icon: "⌂" },
  { id: "revenue", name: "Báo cáo doanh thu", icon: "⌁" },
  { id: "sales", name: "Bán hàng", icon: "🛒" },
  { id: "orders", name: "Đơn hàng", icon: "▣" },
  { id: "customers", name: "Khách hàng", icon: "♙" },
  { id: "reviews", name: "Đánh giá khách hàng", icon: "★" },
  { id: "messages", name: "Tin nhắn khách hàng", icon: "💬" },
  { id: "products", name: "Sản phẩm", icon: "◈" },
  { id: "categories", name: "Danh mục", icon: "▤" },
  { id: "banners", name: "Banner theo mùa", icon: "▰" },
  { id: "vouchers", name: "Mã giảm giá", icon: "◇" },
  { id: "suppliers", name: "Nhà cung cấp", icon: "▧" },
  { id: "inventory", name: "Quản lý kho", icon: "▦" },
  { id: "employees", name: "Nhân viên", icon: "♟" },
];
const visibleMenu = computed(() =>
  authStore.isAdmin
    ? menu
    : menu.filter((item) =>
        ["revenue", "customers", "reviews"].includes(item.id),
      ),
);
const reportFilter = ref({
  period: "month",
  payment_method: "all",
  start_date: "",
  end_date: "",
});
const resetDates = () => {
  if (reportFilter.value.period !== "custom") {
    reportFilter.value.start_date = "";
    reportFilter.value.end_date = "";
  }
};
const blankBatch = () => ({
  product_id: "",
  batch_code: "",
  manufacture_date: "",
  quantity: 1,
  expiry_date: "",
  import_price: 0,
});
const manualBatch = ref(blankBatch());
const inventoryProducts = computed(() => products.value);
const filteredBatches = computed(() => {
  const term = batchSearch.value.toLowerCase();
  // Phiếu tiêu hủy đã là lịch sử đối soát; không giữ lô đã xử lý trong bảng
  // vận hành hằng ngày để quản trị viên không vô tình thao tác lần nữa.
  return batches.value.filter(
    (batch) =>
      batch.status !== "expired" &&
      `${batch.batch_code} ${batch.products?.sku || ""} ${batch.products?.name || ""}`
        .toLowerCase()
        .includes(term),
  );
});
const title = computed(
  () => menu.find((item) => item.id === tab.value)?.name || "Quản trị",
);
const descriptions = {
  customers: "Thông tin và trạng thái tài khoản khách hàng.",
  reviews: "Xem và phản hồi các đánh giá của khách hàng.",
  employees: "Danh sách tài khoản nhân viên và quyền làm việc.",
  categories: "Nhóm nguyên liệu, dụng cụ và set combo.",
  products: "Danh mục hàng hóa đang bán.",
  banners: "Thay ảnh, nội dung, thứ tự và đường dẫn banner theo từng mùa bánh.",
  vouchers: "Các mã ưu đãi đang áp dụng cho đơn hàng.",
  suppliers: "Đối tác cung cấp nguyên liệu và dụng cụ.",
  orders: "Theo dõi đơn online và đơn tại quầy.",
  inventory: "Theo dõi hàng tồn, lô nhập và hạn sử dụng.",
};
const description = computed(() => descriptions[tab.value] || "");
const money = (value) => Number(value || 0).toLocaleString("vi-VN") + "đ";
const text = (key) => (row) => row?.[key] ?? "-";
const status = (key) => (row) => (row?.[key] ? "Hoạt động" : "Đã khóa");
const customerCols = [
  ["Họ tên", text("full_name")],
  ["Email", text("email")],
  ["Điện thoại", text("phone")],
  ["Trạng thái", status("is_active")],
];
const employeeCols = [
  ["Họ tên", text("full_name")],
  ["Email", text("email")],
  ["Vai trò", text("role")],
  ["Trạng thái", status("is_active")],
];
const categoryCols = [
  ["Tên danh mục", text("name")],
  ["Đường dẫn", text("slug")],
  ["Mô tả", text("description")],
];
const productCols = [
  ["SKU", text("sku")],
  ["Tên sản phẩm", text("name")],
  ["Danh mục", (r) => r.categories?.name || "-"],
  ["Giá bán", (r) => money(r.price)],
  ["Đơn vị", text("unit")],
];
const supplierCols = [
  ["Mã NCC", text("code")],
  ["Tên nhà cung cấp", text("name")],
  ["Người liên hệ", text("contact_person")],
  ["Điện thoại", text("phone")],
  ["Email", text("email")],
];
const voucherCols = [
  ["Mã giảm giá", text("code")],
  ["Loại giảm", text("discount_type")],
  ["Giá trị", text("discount_value")],
  ["Đơn tối thiểu", (r) => money(r.min_order_amount)],
  ["Hiệu lực", status("is_active")],
];
const orderCols = [
  ["Mã đơn", text("order_code")],
  ["Khách hàng", (r) => r.users?.full_name || r.recipient_name || "-"],
  ["Loại đơn", text("order_type")],
  ["Tổng tiền", (r) => money(r.final_amount)],
  ["Trạng thái", text("order_status")],
];
const stockCols = [
  ["SKU", text("sku")],
  ["Sản phẩm", text("name")],
  ["Tồn kho", text("total_stock")],
  ["Đơn vị", text("unit")],
  ["Hạn gần nhất", text("nearest_expiry")],
];
const batchCols = [
  ["Mã lô", text("batch_code")],
  ["Mã sản phẩm", (r) => r.products?.sku || "-"],
  ["Sản phẩm", (r) => r.products?.name || "-"],
  ["Ngày nhập", (r) => r.manufacture_date || r.created_at?.slice(0, 10) || "-"],
  ["Hạn sử dụng", text("expiry_date")],
  ["Tồn lô", text("current_quantity")],
  ["Trạng thái", text("status")],
];
const reportProductCols = [
  ["SKU", text("sku")],
  ["Sản phẩm", text("name")],
  ["Số lượng bán", text("quantity")],
  ["Doanh thu", (r) => money(r.revenue)],
];
const filteredAdminProducts = computed(() =>
  products.value.filter(
    (product) =>
      (productType.value === "all" ||
        (productType.value === "combo"
          ? product.is_combo
          : !product.is_combo)) &&
      (productState.value === "all" ||
        (productState.value === "active"
          ? product.is_active
          : !product.is_active)) &&
      `${product.name} ${product.sku}`
        .toLowerCase()
        .includes(productSearch.value.toLowerCase()),
  ),
);
const filteredUsers = computed(() => {
  const source = tab.value === "customers" ? customers.value : employees.value;
  const term = userSearch.value.toLowerCase();
  return source.filter(
    (user) =>
      (!userRoleFilter.value || user.role === userRoleFilter.value) &&
      `${user.full_name} ${user.email} ${user.phone || ""}`
        .toLowerCase()
        .includes(term),
  );
});
const filteredStoreReviews = computed(() => {
  const term = reviewSearch.value.toLowerCase();
  return storeReviews.value.filter((review) =>
    `${review.products?.name || ""} ${review.products?.sku || ""} ${review.customer_name || ""} ${review.comment || ""} ${review.response_comment || ""}`
      .toLowerCase()
      .includes(term),
  );
});
const filteredConversations = computed(() => {
  const term = conversationSearch.value.toLowerCase();
  return conversations.value.filter((item) =>
    `${item.customer.full_name || ""} ${item.customer.email || ""} ${item.customer.phone || ""}`
      .toLowerCase()
      .includes(term),
  );
});
const entityFields = computed(
  () =>
    ({
      categories: [
        { key: "name", label: "Tên danh mục", required: true },
        { key: "slug", label: "Đường dẫn" },
        { key: "description", label: "Mô tả", type: "textarea" },
        { key: "image_url", label: "Ảnh danh mục" },
      ],
      banners: [
        { key: "title", label: "Tiêu đề banner", required: true },
        { key: "season", label: "Chủ đề / mùa bánh" },
        { key: "story_title", label: "Tiêu đề bài viết / câu chuyện" },
        {
          key: "story_content",
          label: "Nội dung giới thiệu",
          type: "textarea",
        },
        {
          key: "category_id",
          label: "Danh mục sản phẩm hiển thị",
          type: "select",
          options: [
            { value: "", label: "Tự động theo chủ đề" },
            ...categories.value.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ],
        },
        { key: "target_url", label: "Đường dẫn khi bấm" },
        { key: "sort_order", label: "Thứ tự hiển thị", type: "number", min: 0 },
        { key: "image_url", label: "Ảnh banner" },
      ],
      suppliers: [
        { key: "code", label: "Mã NCC", required: true },
        { key: "name", label: "Tên nhà cung cấp", required: true },
        { key: "contact_person", label: "Người liên hệ" },
        { key: "phone", label: "Điện thoại" },
        { key: "email", label: "Email", type: "email" },
        { key: "address", label: "Địa chỉ", type: "textarea" },
      ],
      vouchers: [
        { key: "code", label: "Mã giảm giá", required: true },
        {
          key: "discount_type",
          label: "Loại giảm",
          type: "select",
          options: [
            { value: "percentage", label: "Phần trăm" },
            { value: "fixed", label: "Số tiền" },
          ],
        },
        {
          key: "discount_value",
          label: "Giá trị",
          type: "number",
          min: 0,
          required: true,
        },
        {
          key: "min_order_amount",
          label: "Đơn tối thiểu",
          type: "number",
          min: 0,
        },
        {
          key: "max_discount_amount",
          label: "Giảm tối đa",
          type: "number",
          min: 0,
        },
        {
          key: "usage_limit",
          label: "Lượt dùng tối đa",
          type: "number",
          min: 1,
        },
        {
          key: "end_date",
          label: "Ngày hết hạn",
          type: "datetime-local",
          required: true,
        },
      ],
    })[tab.value] || [],
);
const entityRows = computed(
  () =>
    ({
      categories: categories.value,
      banners: banners.value,
      suppliers: suppliers.value,
      vouchers: vouchers.value,
    })[tab.value] || [],
);
const entityTableFields = computed(() =>
  tab.value === "banners"
    ? [
        { key: "title", label: "Tiêu đề banner" },
        { key: "season", label: "Chủ đề" },
        { key: "category_id", label: "Danh mục sản phẩm" },
        { key: "sort_order", label: "Thứ tự" },
      ]
    : entityFields.value.filter((field) => field.key !== "image_url"),
);
const filteredEntities = computed(() => {
  const query = entitySearch.value.toLowerCase();
  return entityRows.value.filter((row) =>
    entityFields.value.some((field) =>
      String(row[field.key] ?? "")
        .toLowerCase()
        .includes(query),
    ),
  );
});
const formatEntityValue = (row, key) =>
  key === "min_order_amount" || key === "max_discount_amount"
    ? money(row[key])
    : key === "end_date"
      ? row[key]
        ? new Date(row[key]).toLocaleDateString("vi-VN")
        : "-"
      : key === "category_id"
        ? categories.value.find((item) => item.id === row.category_id)?.name ||
          "Tự động theo chủ đề"
        : (row[key] ?? "-");
const openProductForm = (product) => {
  editingProduct.value = product || null;
  productForm.value = product
    ? {
        ...product,
        category_id: product.category_id || product.categories?.id || "",
      }
    : blankProduct();
  showProductForm.value = true;
};
const saveProduct = () =>
  safe(async () => {
    const {
      id,
      categories: ignoredCategory,
      warehouse_locations: ignoredLocation,
      rating_average: ignoredRating,
      rating_count: ignoredCount,
      stock_quantity: ignoredStock,
      ...fields
    } = productForm.value;
    const data = {
      ...fields,
      slug: (fields.slug || fields.name)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, ""),
    };
    if (editingProduct.value?.id)
      await productApi.updateProduct(editingProduct.value.id, data);
    else await productApi.createProduct(data);
    showProductForm.value = false;
    await loaders.products();
  });
const removeProduct = (product) => {
  if (!window.confirm(`Ẩn sản phẩm “${product.name}” khỏi cửa hàng?`)) return;
  safe(async () => {
    await productApi.deleteProduct(product.id);
    await loaders.products();
  });
};
const blankEntity = () =>
  tab.value === "categories"
    ? { name: "", slug: "", description: "", image_url: "" }
    : tab.value === "banners"
      ? {
          title: "",
          season: "",
          story_title: "",
          story_content: "",
          category_id: "",
          target_url: "/banner/",
          sort_order: banners.value.length + 1,
          image_url: "",
          is_active: true,
        }
      : tab.value === "suppliers"
        ? {
            code: "",
            name: "",
            contact_person: "",
            phone: "",
            email: "",
            address: "",
          }
        : {
            code: "",
            discount_type: "percentage",
            discount_value: 0,
            min_order_amount: 0,
            max_discount_amount: 0,
            usage_limit: 100,
            end_date: "",
            is_active: true,
          };
const openEntityForm = (row) => {
  editingEntity.value = row || null;
  entityForm.value = row
    ? {
        ...row,
        end_date: row.end_date
          ? new Date(row.end_date).toISOString().slice(0, 16)
          : "",
      }
    : blankEntity();
  showEntityForm.value = true;
};
const readImageFile = (file, onLoad) => {
  if (!file) return;
  if (!file.type?.startsWith("image/")) {
    error.value = "Vui lòng chọn đúng tệp ảnh.";
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    error.value = "Ảnh cần nhỏ hơn hoặc bằng 2 MB.";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result || ""));
  reader.onerror = () => {
    error.value = "Không thể đọc tệp ảnh. Vui lòng thử ảnh khác.";
  };
  reader.readAsDataURL(file);
};
const selectProductImage = (event) => {
  readImageFile(event.target.files?.[0], (dataUrl) => {
    productForm.value.image_url = dataUrl;
  });
  event.target.value = "";
};
const selectEntityImage = (event) => {
  readImageFile(event.target.files?.[0], (dataUrl) => {
    entityForm.value.image_url = dataUrl;
  });
  event.target.value = "";
};
const saveEntity = () =>
  safe(async () => {
    const data = { ...entityForm.value };
    if (tab.value === "categories" && !data.slug)
      data.slug = data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    if (tab.value === "banners") {
      if (editingEntity.value)
        await bannerApi.update(editingEntity.value.id, data);
      else await bannerApi.create(data);
    } else {
      const suffix =
        tab.value === "categories"
          ? "Category"
          : tab.value === "suppliers"
            ? "Supplier"
            : "Voucher";
      const verb = editingEntity.value ? "update" : "create";
      await adminApi[`${verb}${suffix}`](
        ...(editingEntity.value ? [editingEntity.value.id, data] : [data]),
      );
    }
    showEntityForm.value = false;
    editingEntity.value = null;
    await loaders[tab.value]();
  });
const removeEntity = (row) => {
  if (!window.confirm(`Xóa ${row.title || row.name || row.code}?`)) return;
  safe(async () => {
    if (tab.value === "banners") await bannerApi.remove(row.id);
    else {
      const action =
        tab.value === "categories"
          ? "deleteCategory"
          : tab.value === "suppliers"
            ? "deleteSupplier"
            : "deleteVoucher";
      await adminApi[action](row.id);
    }
    await loaders[tab.value]();
  });
};
const openPriceHistory = (product) =>
  safe(async () => {
    historyProduct.value = product;
    const result = await productApi.getPriceHistory(product.id);
    priceHistory.value = result.history || [];
    showPriceHistory.value = true;
  });
const updateUserRole = (user, role) =>
  safe(async () => {
    await adminApi.updateUser(user.id, { role });
    await loaders[tab.value]();
  });
const openUserForm = () => {
  editingUser.value = null;
  userForm.value = blankUser(tab.value === "employees" ? "staff" : "customer");
  showUserForm.value = true;
};
const editUser = (user) => {
  editingUser.value = user;
  userForm.value = {
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    password: "",
    role: user.role || "customer",
  };
  showUserForm.value = true;
};
const saveUser = () =>
  safe(async () => {
    if (editingUser.value) {
      const data = {
        full_name: userForm.value.full_name,
        phone: userForm.value.phone,
        role: userForm.value.role,
      };
      if (authStore.isAdmin)
        await adminApi.updateUser(editingUser.value.id, data);
      else await adminApi.updateCustomer(editingUser.value.id, data);
    } else {
      if (authStore.isAdmin) await adminApi.createUser(userForm.value);
      else await adminApi.createCustomer(userForm.value);
    }
    showUserForm.value = false;
    editingUser.value = null;
    await loaders[tab.value]();
  });
const toggleUser = (user) =>
  safe(async () => {
    if (
      !authStore.isAdmin &&
      !window.confirm(`Xóa khách hàng “${user.full_name}”?`)
    )
      return;
    if (authStore.isAdmin)
      await adminApi.updateUser(user.id, { is_active: !user.is_active });
    else await adminApi.updateCustomer(user.id, { is_active: false });
    await loaders[tab.value]();
  });
const changeOrderStatus = (order, status) =>
  safe(async () => {
    await orderApi.updateOrderStatus(order.id, status);
    await loaders.orders();
  });
const openOrder = (order) => router.push(`/order/${order.id}`);
const loadStoreReviews = () =>
  safe(async () => {
    const result = await adminApi.getStoreReviews();
    storeReviews.value = (result.reviews || []).map((review) => ({
      ...review,
      response_draft: review.response_comment || "",
    }));
  });
const saveReviewResponse = (review) =>
  safe(async () => {
    if (!review.response_draft?.trim())
      throw new Error("Vui lòng nhập nội dung phản hồi.");
    await adminApi.respondToReview(review.id, {
      response_comment: review.response_draft,
    });
    await loadStoreReviews();
  });
const loadConversations = () =>
  safe(async () => {
    const result = await supportChatApi.getConversations();
    conversations.value = result.conversations || [];
    if (selectedConversation.value) {
      selectedConversation.value =
        conversations.value.find(
          (item) => item.customer.id === selectedConversation.value.customer.id,
        ) || null;
    }
    if (!selectedConversation.value && conversations.value.length)
      selectedConversation.value = conversations.value[0];
  });
const sendAdminReply = () =>
  safe(async () => {
    if (!selectedConversation.value || !adminReplyDraft.value.trim()) return;
    await supportChatApi.replyToCustomer(
      selectedConversation.value.customer.id,
      adminReplyDraft.value,
    );
    adminReplyDraft.value = "";
    await loadConversations();
  });
const logout = () => {
  if (!window.confirm("Bạn có chắc muốn đăng xuất không?")) return;
  authStore.logout();
  window.location.assign("/login");
};
const importExcel = (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  importMessage.value = "";
  importResult.value = null;
  safe(async () => {
    const body = new FormData();
    body.append("file", file);
    const result = await inventoryApi.importExcel(body);
    const results = result.results || {};
    importResult.value = {
      success: Number(results.success || 0) > 0,
      errors: results.errors || [],
    };
    importMessage.value =
      result.message ||
      `Đã nhập ${results.success || 0} lô hàng; ${results.failed || 0} dòng lỗi.`;
    await loadInventory();
    event.target.value = "";
  });
};
const editBatch = (batch) => {
  editingBatch.value = batch;
  manualBatch.value = {
    product_id: batch.product_id || batch.products?.id || "",
    batch_code: batch.batch_code || "",
    manufacture_date: batch.manufacture_date || "",
    expiry_date: batch.expiry_date || "",
    quantity: Number(batch.current_quantity || 0),
    import_price: Number(batch.import_price || 0),
  };
  window.scrollTo({ top: 0, behavior: "smooth" });
};
const cancelBatchEdit = () => {
  editingBatch.value = null;
  manualBatch.value = blankBatch();
};
const saveManualBatch = () =>
  safe(async () => {
    batchSaveMessage.value = "";
    if (editingBatch.value) {
      await inventoryApi.updateBatch(editingBatch.value.id, {
        ...manualBatch.value,
        current_quantity: manualBatch.value.quantity,
      });
      batchSaveMessage.value = "Đã lưu điều chỉnh lô hàng và cập nhật tồn kho.";
    } else {
      await inventoryApi.addBatch({
        ...manualBatch.value,
        manufacture_date: manualBatch.value.manufacture_date || null,
      });
      batchSaveMessage.value = "Đã nhập lô hàng mới vào kho.";
    }
    cancelBatchEdit();
    await loadInventory();
  });
const removeBatch = (batch) => {
  if (
    !window.confirm(
      `Xóa lô “${batch.batch_code}”? Thao tác này không thể hoàn tác.`,
    )
  )
    return;
  safe(async () => {
    await inventoryApi.deleteBatch(batch.id);
    if (editingBatch.value?.id === batch.id) cancelBatchEdit();
    await loadInventory();
  });
};
const isExpired = (batch) =>
  Boolean(batch?.expiry_date) &&
  batch.expiry_date < new Date().toISOString().slice(0, 10);
// Lô đã tiêu hủy vẫn được chọn để in lại phiếu; lô còn tồn sẽ được lập phiếu mới.
const canDispose = (batch) =>
  isExpired(batch) &&
  (Number(batch.current_quantity) > 0 || batch.status === "expired");
const batchStatus = (batch) =>
  isExpired(batch) && batch.status === "active"
    ? "Đã hết hạn"
    : batch.status === "expired"
      ? "Đã tiêu hủy / hết hạn"
      : batch.status === "depleted"
        ? "Đã hết hàng"
        : batch.status;
const disposeExpiredBatch = (batch) => {
  const isReprint = Number(batch.current_quantity) <= 0;
  const action = isReprint
    ? "Tải lại phiếu PDF"
    : "Lập phiếu xuất tiêu hủy và tải PDF";
  if (
    !window.confirm(
      `${action} cho lô ${batch.batch_code}?${isReprint ? "" : " Số lượng lô sẽ được trừ khỏi tồn kho."}`,
    )
  )
    return;
  safe(async () => {
    const blob = await inventoryApi.exportExpiredDisposals([batch.id], "pdf");
    downloadBlob(blob, `Phieu_xuat_tieu_huy_${batch.batch_code}.pdf`);
    importResult.value = { success: true, errors: [], type: "disposal" };
    importMessage.value = isReprint
      ? `Đã tải lại phiếu tiêu hủy cho lô ${batch.batch_code}.`
      : `Đã lập và tải phiếu xuất tiêu hủy cho lô ${batch.batch_code}.`;
    await loadInventory();
  });
};
const toggleExpiredBatch = (id, checked) => {
  selectedExpiredBatchIds.value = checked
    ? [...selectedExpiredBatchIds.value, id]
    : selectedExpiredBatchIds.value.filter((item) => item !== id);
};
const exportSelectedDisposals = (format) => {
  const count = selectedExpiredBatchIds.value.length;
  if (!count) return;
  const label = format === "pdf" ? "PDF" : "Excel";
  if (
    !window.confirm(
      `Lập hoặc in lại phiếu xuất tiêu hủy cho ${count} lô hết hạn và tải file ${label}? Lô còn tồn sẽ được trừ khỏi kho.`,
    )
  )
    return;
  safe(async () => {
    const blob = await inventoryApi.exportExpiredDisposals(
      selectedExpiredBatchIds.value,
      format,
    );
    const timestamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    downloadBlob(blob, `Phieu_xuat_tieu_huy_${timestamp}.${format}`);
    selectedExpiredBatchIds.value = [];
    importResult.value = { success: true, errors: [], type: "disposal" };
    importMessage.value = `Đã lập hoặc in lại phiếu xuất tiêu hủy cho ${count} lô và tải file ${label}.`;
    await loadInventory();
  });
};
const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
const downloadInventoryTemplate = () =>
  safe(async () =>
    downloadBlob(
      await inventoryApi.downloadTemplate(),
      "Mau_Nhap_Kho_Tiem_Oc.xlsx",
    ),
  );
const Table = (props) =>
  h("div", { class: "table-wrap" }, [
    h("table", [
      h("thead", [
        h(
          "tr",
          props.cols.map((col) => h("th", col[0])),
        ),
      ]),
      h(
        "tbody",
        props.rows.length
          ? props.rows.map((row) =>
              h(
                "tr",
                { key: row.id },
                props.cols.map((col) => h("td", col[1](row))),
              ),
            )
          : [
              h("tr", [
                h(
                  "td",
                  { colspan: props.cols.length, class: "empty" },
                  "Chưa có dữ liệu.",
                ),
              ]),
            ],
      ),
    ]),
  ]);
Table.props = { cols: Array, rows: Array };
const safe = async (action) => {
  error.value = "";
  try {
    await action();
  } catch (e) {
    error.value = e.message || "Không thể tải dữ liệu. Vui lòng thử lại.";
  }
};
const loadDashboard = () =>
  safe(
    async () =>
      (dashboard.value = (await adminApi.getDashboard()).dashboard || {}),
  );
const loadRevenue = () =>
  safe(async () => {
    if (
      reportFilter.value.period === "custom" &&
      (!reportFilter.value.start_date || !reportFilter.value.end_date)
    )
      throw new Error("Vui lòng chọn đủ ngày bắt đầu và ngày kết thúc.");
    revenueReport.value = await adminApi.getRevenue(reportFilter.value);
  });
const revenueSeries = computed(() => revenueReport.value.series || []);
const maxRevenue = computed(() =>
  Math.max(1, ...revenueSeries.value.map((point) => Number(point.amount || 0))),
);
const maxPaymentRevenue = computed(() =>
  Math.max(
    1,
    ...(revenueReport.value.by_payment || []).map((item) =>
      Number(item.amount || 0),
    ),
  ),
);
const loadInventory = () =>
  safe(async () => {
    const [a, b, c] = await Promise.all([
      inventoryApi.getStock(),
      inventoryApi.getBatches(),
      productApi.getAdminProducts({ limit: 100, include_inactive: true }),
    ]);
    stock.value = a.stock || [];
    batches.value = b.batches || [];
    products.value = c.products || [];
  });
const loaders = {
  customers: () =>
    safe(
      async () =>
        (customers.value =
          (authStore.isAdmin
            ? await adminApi.getUsers({ role: "customer" })
            : await adminApi.getCustomerDirectory()
          ).users || []),
    ),
  employees: () =>
    safe(async () => {
      const [staff, admins] = await Promise.all([
        adminApi.getUsers({ role: "staff" }),
        adminApi.getUsers({ role: "admin" }),
      ]);
      employees.value = [...(staff.users || []), ...(admins.users || [])];
    }),
  categories: () =>
    safe(
      async () =>
        (categories.value =
          (await productApi.getCategories()).categories || []),
    ),
  banners: () =>
    safe(async () => {
      const [bannerResult, categoryResult] = await Promise.all([
        bannerApi.getAdmin(),
        productApi.getCategories(),
      ]);
      banners.value = bannerResult.banners || [];
      categories.value = categoryResult.categories || [];
    }),
  products: () =>
    safe(async () => {
      const [productResult, categoryResult] = await Promise.all([
        productApi.getAdminProducts({ limit: 100, include_inactive: true }),
        productApi.getCategories(),
      ]);
      products.value = productResult.products || [];
      categories.value = categoryResult.categories || [];
    }),
  vouchers: () =>
    safe(
      async () =>
        (vouchers.value = (await adminApi.getVouchers()).vouchers || []),
    ),
  suppliers: () =>
    safe(
      async () =>
        (suppliers.value = (await adminApi.getSuppliers()).suppliers || []),
    ),
  orders: () =>
    safe(
      async () =>
        (orders.value =
          (await orderApi.getAllOrders({ limit: 100 })).orders || []),
    ),
  inventory: loadInventory,
  revenue: loadRevenue,
  reviews: loadStoreReviews,
  messages: loadConversations,
};
const routeSectionToTab = (section) =>
  route.name === "staff-revenue"
    ? "revenue"
    : route.name === "staff-customers"
      ? "customers"
      : route.name === "staff-reviews"
        ? "reviews"
        : section === "warehouse"
          ? "inventory"
          : section || "dashboard";
const openTab = (id) => {
  tab.value = id;
  const section = id === "inventory" ? "warehouse" : id;
  if (route.params.section !== section) router.push(`/admin/${section}`);
  id === "dashboard" ? loadDashboard() : loaders[id]?.();
};
watch(
  () => [
    reportFilter.value.period,
    reportFilter.value.payment_method,
    reportFilter.value.start_date,
    reportFilter.value.end_date,
  ],
  () => {
    if (
      reportFilter.value.period !== "custom" ||
      (reportFilter.value.start_date && reportFilter.value.end_date)
    )
      loadRevenue();
  },
);
watch(
  () => [route.name, route.params.section],
  ([, section]) => {
    const id = routeSectionToTab(section);
    if (visibleMenu.value.some((item) => item.id === id) && id !== tab.value) {
      tab.value = id;
      id === "dashboard" ? loadDashboard() : loaders[id]?.();
    }
  },
);
onMounted(() => openTab(routeSectionToTab(route.params.section)));
</script>

<style>
.admin-shell {
  display: flex;
  min-height: 100vh;
  background: #f8f5f0;
  color: #302822;
}
.sidebar {
  width: 235px;
  background: #fff;
  border-right: 1px solid #ebdfd4;
  padding: 25px 14px;
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
}
.brand {
  color: #aa1747;
  font-size: 23px;
  font-weight: 900;
  letter-spacing: 1px;
  padding: 0 13px 26px;
}
.brand small {
  display: block;
  color: #847970;
  font-size: 10px;
  letter-spacing: 2px;
  margin-top: 4px;
}
.sidebar button {
  border: 0;
  background: transparent;
  border-radius: 10px;
  padding: 12px 13px;
  text-align: left;
  font: inherit;
  font-weight: 650;
  color: #5d5149;
  cursor: pointer;
  font-size: 15px;
}
.sidebar button span {
  display: inline-block;
  width: 29px;
  color: #aa1747;
}
.sidebar button:hover,
.sidebar button.active {
  background: #fff0f4;
  color: #aa1747;
}
.sidebar a {
  margin-top: auto;
  padding: 14px;
  color: #847970;
  text-decoration: none;
  font-weight: 600;
}
main {
  flex: 1;
  padding: 36px;
  max-width: 1450px;
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 28px;
}
header p {
  margin: 0;
  color: #bd7006;
  font-size: 17px;
}
h1 {
  margin: 5px 0 0;
  color: #aa1747;
  font-size: 32px;
}
header b {
  background: #fff;
  border: 1px solid #ebdfd4;
  padding: 10px 16px;
  border-radius: 99px;
}
section {
  background: #fff;
  border: 1px solid #ebdfd4;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 3px 12px #44291108;
}
h2 {
  margin: 0 0 8px;
  color: #aa1747;
  font-size: 21px;
}
h3 {
  font-size: 17px;
  margin: 25px 0 10px;
}
.metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 18px;
  margin-bottom: 22px;
}
.metrics article {
  background: #fff;
  border: 1px solid #ebdfd4;
  border-radius: 15px;
  padding: 20px;
  display: grid;
  grid-template-columns: 45px 1fr;
  box-shadow: 0 3px 12px #44291108;
}
.metrics span {
  grid-row: span 2;
  font-size: 26px;
}
.metrics small {
  color: #81766e;
}
.metrics strong {
  font-size: 19px;
  margin-top: 6px;
}
.heading,
.sales {
  display: flex;
  justify-content: space-between;
  align-items: start;
  gap: 18px;
  margin-bottom: 18px;
}
.heading p,
.sales p {
  margin: 0;
  color: #81766e;
}
.heading button,
.sales a,
.product-toolbar button {
  background: #aa1747;
  color: #fff;
  border: 0;
  border-radius: 9px;
  padding: 11px 15px;
  text-decoration: none;
  font-weight: 700;
  cursor: pointer;
}
.sales {
  align-items: center;
  margin: 0;
}
.table-wrap {
  overflow: auto;
  border: 1px solid #eee5dc;
  border-radius: 10px;
}
table {
  border-collapse: collapse;
  width: 100%;
  min-width: 630px;
}
th {
  background: #f8f2ec;
  text-align: left;
  color: #685b51;
  padding: 13px;
  font-size: 13px;
}
td {
  padding: 14px 13px;
  border-top: 1px solid #f0e8df;
  font-size: 14px;
}
.empty {
  text-align: center;
  color: #887b72;
  padding: 27px !important;
}
.notice {
  background: #fff3e8;
  color: #77553b;
  border-radius: 9px;
  padding: 12px 14px;
  margin-bottom: 20px;
}
.error {
  background: #ffe8e8;
  color: #a22727;
  border: 1px solid #f5bbbb;
  border-radius: 9px;
  padding: 12px 14px;
}
.product-toolbar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}
.product-toolbar select,
.product-toolbar input {
  border: 1px solid #ded4ca;
  border-radius: 8px;
  padding: 10px;
  font: inherit;
}
.product-toolbar input {
  margin-left: auto;
  min-width: 220px;
}
.product-table-wrap {
  overflow: auto;
  border: 1px solid #e9e0d8;
  border-radius: 9px;
}
.product-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 900px;
}
.product-table th {
  background: #f8f2ec;
  text-align: left;
  padding: 13px;
}
.product-table td {
  padding: 11px;
  border-top: 1px solid #eee7e0;
}
.product-table img {
  width: 48px;
  height: 48px;
  border-radius: 7px;
  object-fit: cover;
}
.tag,
.state {
  padding: 5px 9px;
  border-radius: 99px;
  font-size: 12px;
  white-space: nowrap;
}
.tag {
  border: 1px solid #d8cec4;
}
.state.active {
  background: #e8f7eb;
  color: #197637;
}
.state.inactive {
  background: #f1eeee;
  color: #777;
}
.edit-button {
  background: #326b35;
  color: #fff;
  border: 0;
  border-radius: 6px;
  padding: 8px 11px;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  font-size: 12px;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: #0006;
  display: grid;
  place-items: center;
  z-index: 1000;
  padding: 20px;
}
.product-form {
  background: #fff;
  width: min(600px, 100%);
  border-radius: 14px;
  padding: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.product-form h3 {
  grid-column: 1/-1;
  margin: 0;
  color: #aa1747;
}
.product-form label {
  font-size: 13px;
  font-weight: 700;
}
.product-form input,
.product-form select {
  display: block;
  box-sizing: border-box;
  width: 100%;
  margin-top: 5px;
  padding: 9px;
  border: 1px solid #ded4ca;
  border-radius: 7px;
  font: inherit;
}
.product-form .check {
  display: flex;
  align-items: center;
  gap: 7px;
}
.product-form .check input {
  width: auto;
  margin: 0;
}
.form-actions {
  grid-column: 1/-1;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
.form-actions button {
  border: 0;
  border-radius: 7px;
  padding: 10px 14px;
  font-weight: 700;
  cursor: pointer;
}
.form-actions button[type="submit"] {
  background: #aa1747;
  color: #fff;
}
@media (max-width: 850px) {
  .sidebar {
    width: 64px;
    padding: 16px 7px;
  }
  .brand,
  .sidebar button,
  .sidebar a {
    font-size: 0;
    padding: 13px;
  }
  .brand small {
    display: none;
  }
  .sidebar button span {
    font-size: 18px;
  }
  .sidebar a {
    display: none;
  }
  main {
    padding: 22px 14px;
  }
  .metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  h1 {
    font-size: 25px;
  }
  header b {
    display: none;
  }
  .product-toolbar {
    flex-wrap: wrap;
  }
  .product-toolbar input {
    margin-left: 0;
    min-width: 0;
    flex: 1;
  }
}
@media (max-width: 500px) {
  .sidebar {
    display: none;
  }
  .metrics {
    grid-template-columns: 1fr;
  }
  main {
    padding: 18px 11px;
  }
  .product-form {
    grid-template-columns: 1fr;
  }
}
.admin-shell {
  display: block;
  background: #f8f5f0;
  min-height: 100vh;
}
.sidebar {
  display: flex !important;
  position: fixed;
  z-index: 1001;
  left: 0;
  top: 0;
  bottom: 0;
  transform: translateX(-105%);
  transition: transform 0.22s ease;
  box-shadow: 6px 0 24px #0002;
}
.sidebar.open {
  transform: translateX(0);
}
.sidebar-mask {
  position: fixed;
  inset: 0;
  background: #0005;
  z-index: 1000;
}
.sidebar-logout {
  margin-top: 16px !important;
  color: #a22727 !important;
  background: #fff0f0 !important;
}
.admin-shell main {
  max-width: none;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 28px 48px;
}
.header-title {
  display: flex;
  gap: 15px;
  align-items: center;
}
.menu-toggle {
  width: 44px;
  height: 44px;
  border: 1px solid #eadfd4;
  border-radius: 9px;
  background: #fff;
  font-size: 22px;
  cursor: pointer;
}
.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-actions button {
  border: 0;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff0f0;
  color: #a22727;
  font-weight: 700;
  cursor: pointer;
}
.user-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.user-toolbar button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #b51852;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.user-toolbar input,
.user-toolbar select,
.product-table select {
  border: 1px solid #ded4ca;
  border-radius: 7px;
  padding: 9px;
  font: inherit;
}
.user-toolbar input {
  min-width: 260px;
}
.edit-button {
  background: #b51852;
}
.history-button {
  margin-left: 7px;
  border: 1px solid #b51852;
  border-radius: 6px;
  padding: 7px 9px;
  background: #fff;
  color: #b51852;
  font-weight: 700;
  cursor: pointer;
  font-size: 12px;
}
.product-name {
  padding: 0;
  border: 0;
  background: none;
  color: #82103b;
  text-align: left;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.lock-button,
.delete-button {
  margin-left: 7px;
  border: 0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fff0f0;
  color: #a22727;
  font-weight: 700;
  cursor: pointer;
  font-size: 12px;
}
.inventory-actions {
  display: flex;
  gap: 10px;
  margin: 16px 0;
}
.inventory-actions a,
.inventory-actions label {
  display: inline-block;
  background: #aa1747;
  color: #fff;
  border-radius: 8px;
  padding: 10px 13px;
  font-weight: 700;
  cursor: pointer;
}
.inventory-actions a {
  background: #fff;
  border: 1px solid #aa1747;
  color: #aa1747;
}
.inventory-actions input {
  display: none;
}
.import-message {
  background: #e9f9ef;
  color: #087a35;
  padding: 10px;
  border-radius: 8px;
}
.product-form textarea {
  display: block;
  box-sizing: border-box;
  width: 100%;
  min-height: 92px;
  margin-top: 5px;
  padding: 9px;
  border: 1px solid #ded4ca;
  border-radius: 7px;
  font: inherit;
  resize: vertical;
}
.product-form .wide {
  grid-column: 1/-1;
}
.history-modal {
  display: block;
  max-width: 760px;
  overflow: auto;
}
.history-modal table {
  min-width: 0;
}
.history-modal .form-actions {
  margin-top: 16px;
}
@media (max-width: 700px) {
  .admin-shell main {
    padding: 18px 11px;
  }
  .user-toolbar {
    flex-wrap: wrap;
  }
  .user-toolbar input {
    min-width: 0;
    flex: 1;
  }
  .header-actions b {
    display: none;
  }
  .inventory-actions {
    flex-wrap: wrap;
  }
}
.image-picker {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px dashed #d9bbca;
  border-radius: 9px;
  background: #fff9fb;
}
.image-picker small {
  color: #786d67;
  font-weight: 400;
}
.image-picker-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.file-button,
.remove-image {
  border: 0;
  border-radius: 7px;
  padding: 9px 11px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}
.file-button {
  background: #b51852;
  color: #fff;
}
.file-button.secondary {
  background: #f4e8ed;
  color: #9f1645;
}
.file-button input {
  display: none !important;
}
.remove-image {
  background: #fff0f0;
  color: #a22727;
}
.image-preview {
  width: 132px;
  max-height: 132px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #eadfd4;
  background: #fff;
}
.modal-backdrop {
  overflow-y: auto;
  align-items: start;
  padding: 28px 20px;
}
.product-form {
  margin: auto;
  max-height: calc(100vh - 56px);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.product-form::-webkit-scrollbar {
  width: 8px;
}
.manual-batch {
  display: grid;
  grid-template-columns: 1.5fr 1fr 1fr 1fr 1fr 1fr;
  gap: 12px;
  align-items: end;
  padding: 18px;
  margin: 0 0 16px;
  border: 1px solid #eadfd4;
  border-radius: 10px;
  background: #fff8fb;
}
.inventory-form-title {
  grid-column: 1/-1;
  display: grid;
  gap: 4px;
}
.inventory-form-title b {
  color: #a0153e;
  font-size: 17px;
}
.inventory-form-title small {
  color: #786d67;
}
.manual-batch label {
  display: grid;
  gap: 6px;
  color: #554a43;
  font-size: 12px;
  font-weight: 700;
}
.manual-batch input,
.manual-batch select {
  border: 1px solid #ded4ca;
  border-radius: 7px;
  padding: 9px;
  font: inherit;
  min-width: 0;
}
.batch-form-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.manual-batch button {
  border: 0;
  border-radius: 7px;
  padding: 10px;
  background: #b51852;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}
.manual-batch button.secondary {
  background: #f3ebe4;
  color: #66584e;
}
.batch-save-message {
  grid-column: 1/-1;
  margin: 0;
  padding: 9px 11px;
  border-radius: 7px;
  background: #e9f9ef;
  color: #087a35;
  font-size: 13px;
  font-weight: 700;
}
.batch-list-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  margin-top: 24px;
}
.batch-list-heading h3 {
  margin: 0;
}
.batch-list-heading p {
  margin: 6px 0 10px;
  color: #786d67;
  font-size: 14px;
}
.batch-list-heading input {
  border: 1px solid #ded4ca;
  border-radius: 7px;
  padding: 10px;
  font: inherit;
  min-width: 275px;
}
.cell-sub {
  display: block;
  color: #877b73;
  margin-top: 3px;
}
@media (max-width: 1100px) {
  .manual-batch {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (max-width: 900px) {
  .manual-batch {
    grid-template-columns: 1fr 1fr;
  }
  .batch-list-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .batch-list-heading input {
    min-width: 0;
  }
  .batch-form-actions {
    grid-column: 1/-1;
  }
}
.report-filters {
  display: flex;
  gap: 9px;
  flex-wrap: wrap;
  margin: 14px 0;
}
.report-filters select,
.report-filters input {
  border: 1px solid #ded4ca;
  border-radius: 7px;
  padding: 9px;
  font: inherit;
}
.report-filters button {
  border: 0;
  border-radius: 7px;
  padding: 9px 14px;
  background: #b51852;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.report-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 14px;
  margin-bottom: 14px;
}
.payment-bars {
  display: grid;
  gap: 18px;
}
.payment-bars div {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 7px;
}
.payment-bars i {
  grid-column: 1/-1;
  height: 15px;
  background: #b51852;
  border-radius: 99px;
  min-width: 3px;
}
@media (max-width: 800px) {
  .report-grid {
    grid-template-columns: 1fr;
  }
}
.sidebar {
  overflow-y: auto;
  overscroll-behavior: contain;
}
.sidebar a {
  flex-shrink: 0;
}
.back-store {
  background: #fff !important;
  color: #7a6253 !important;
  border: 1px solid #eadfd4 !important;
}
.review-management {
  max-width: 980px;
}
.review-search {
  box-sizing: border-box;
  width: 100%;
  margin: 4px 0 16px;
  padding: 11px 12px;
  border: 1px solid #ded4ca;
  border-radius: 8px;
  font: inherit;
}
.store-review-card {
  border: 1px solid #eadfd4;
  border-radius: 11px;
  padding: 16px;
  margin-top: 13px;
  background: #fff;
}
.store-review-card header {
  margin: 0 0 9px;
}
.store-review-card header div {
  display: grid;
  gap: 3px;
}
.store-review-card header small,
.review-date {
  color: #786d67;
}
.admin-review-stars {
  color: #f3a51b;
  white-space: nowrap;
}
.admin-review-stars i {
  color: #ded4ca;
  font-style: normal;
}
.customer-review {
  margin: 0 0 6px;
  line-height: 1.5;
}
.reply-box {
  margin-top: 13px;
  padding: 13px;
  border-radius: 8px;
  background: #fff5f8;
}
.reply-box label {
  display: grid;
  gap: 6px;
  font-size: 13px;
  font-weight: 700;
  color: #6d3144;
}
.reply-box textarea {
  box-sizing: border-box;
  width: 100%;
  min-height: 78px;
  padding: 9px;
  border: 1px solid #dfcdd5;
  border-radius: 7px;
  font: inherit;
  resize: vertical;
}
.reply-box > div {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}
.reply-box small {
  color: #786d67;
}
.reply-box button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 7px;
  padding: 9px 13px;
  background: #b51852;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
@media (max-width: 600px) {
  .store-review-card header,
  .reply-box > div {
    align-items: flex-start;
    flex-direction: column;
  }
  .reply-box button {
    width: 100%;
  }
}
.support-admin {
  max-width: 1100px;
}
.conversation-layout {
  display: grid;
  grid-template-columns: 290px 1fr;
  min-height: 500px;
  border: 1px solid #eadfd4;
  border-radius: 10px;
  overflow: hidden;
}
.conversation-layout > aside {
  padding: 10px;
  background: #fbf7f8;
  border-right: 1px solid #eadfd4;
  overflow: auto;
}
.conversation-layout > aside input {
  box-sizing: border-box;
  width: 100%;
  padding: 9px;
  border: 1px solid #ded4ca;
  border-radius: 7px;
  font: inherit;
}
.conversation-layout > aside button {
  display: grid;
  width: 100%;
  gap: 4px;
  margin-top: 8px;
  padding: 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}
.conversation-layout > aside button.active,
.conversation-layout > aside button:hover {
  background: #fff0f4;
}
.conversation-layout > aside small {
  overflow: hidden;
  color: #786d67;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-main {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 0;
}
.conversation-main header {
  display: grid;
  gap: 3px;
  margin: 0;
  padding: 14px;
  border-bottom: 1px solid #eadfd4;
}
.conversation-main header small {
  color: #786d67;
}
.admin-messages {
  min-height: 300px;
  max-height: 470px;
  overflow: auto;
  padding: 14px;
  background: #fff;
}
.admin-bubble {
  max-width: 76%;
  width: max-content;
  margin: 8px 0;
  padding: 9px 11px;
  border-radius: 10px;
  line-height: 1.4;
}
.admin-bubble small {
  display: block;
  margin-top: 4px;
  font-size: 10px;
  opacity: 0.65;
}
.from-customer {
  background: #f5eff0;
  color: #3d302a;
}
.from-store {
  margin-left: auto;
  background: #a9164e;
  color: #fff;
}
.admin-shared-product{display:flex;align-items:center;gap:9px;min-width:240px;margin-top:7px;padding:8px;border:1px solid #edd7df;border-radius:8px;background:#fff;color:#3d302a;text-decoration:none}.admin-shared-product img{width:46px;height:46px;object-fit:cover;border-radius:6px}.admin-shared-product>span{display:grid;gap:3px}.admin-shared-product b{font-size:13px}.admin-shared-product small{margin:0;color:#a9164e;opacity:1}.from-store .admin-shared-product{border-color:#ffffff66}.from-store .admin-shared-product small{color:#a9164e}
.conversation-main form {
  display: flex;
  gap: 9px;
  padding: 11px;
  border-top: 1px solid #eadfd4;
}
.conversation-main textarea {
  flex: 1;
  min-height: 46px;
  padding: 9px;
  border: 1px solid #ded4ca;
  border-radius: 7px;
  font: inherit;
  resize: vertical;
}
.conversation-main form button {
  align-self: end;
  border: 0;
  border-radius: 7px;
  padding: 10px 13px;
  background: #b51852;
  color: #fff;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.conversation-main form button:disabled {
  opacity: 0.5;
}
.conversation-empty {
  display: grid;
  place-items: center;
  color: #786d67;
  border: 1px solid #eadfd4;
  border-radius: 10px;
}
@media (max-width: 750px) {
  .conversation-layout {
    grid-template-columns: 1fr;
  }
  .conversation-layout > aside {
    max-height: 180px;
    border-right: 0;
    border-bottom: 1px solid #eadfd4;
  }
  .conversation-main {
    min-height: 420px;
  }
}
@media (min-width: 701px) {
  .admin-shell {
    display: flex;
  }
  .admin-shell .sidebar {
    position: sticky !important;
    transform: none !important;
    top: 0;
    left: auto;
    height: 100vh;
    flex: 0 0 235px;
    box-sizing: border-box;
  }
  .admin-shell main {
    flex: 1;
    width: auto;
  }
  .menu-toggle,
  .sidebar-mask {
    display: none !important;
  }
}
.admin-profile {
  display: flex !important;
  align-items: center;
  gap: 7px;
  background: #fff !important;
  color: #302822 !important;
  border: 1px solid #eadfd4 !important;
}
.admin-profile img {
  width: 25px;
  height: 25px;
  object-fit: cover;
  border-radius: 50%;
}

/* Khu vực quản trị dùng cùng phong cách phẳng, sáng và gọn với trang bán
   hàng; bỏ hiệu ứng nổi/"3D" và khóa chiều ngang để viền không bị tràn. */
.admin-shell { background: #fffdf9; overflow-x: hidden; }
.admin-shell main { min-width: 0; max-width: 100%; background: #fffdf9; }
.admin-shell section,
.admin-shell .metrics article,
.admin-shell .conversation-layout,
.admin-shell .product-table-wrap { box-shadow: none; }
.admin-shell section,
.admin-shell .metrics article { border-color: #eadfd4; border-radius: 10px; }
.admin-shell .product-table-wrap,
.admin-shell .conversation-layout { max-width: 100%; box-sizing: border-box; }
.admin-shell .product-table { width: 100%; }
.metric-card {
  border: 1px solid #ebdfd4;
  background: #fff;
  border-radius: 15px;
  padding: 20px;
  display: grid;
  grid-template-columns: 45px 1fr;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 3px 12px #44291108;
  color: inherit;
}
.metric-card:hover {
  border-color: #b51852;
  transform: translateY(-1px);
}
.metric-card span {
  grid-row: span 3;
  font-size: 26px;
}
.metric-card small {
  color: #81766e;
}
.metric-card strong {
  font-size: 19px;
  margin-top: 6px;
}
.metric-card em {
  font-style: normal;
  color: #aa1747;
  font-size: 12px;
  margin-top: 7px;
}
.revenue-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin: 18px 0;
}
.revenue-summary article,
.chart-card {
  border: 1px solid #eee2d8;
  border-radius: 12px;
  padding: 18px;
  background: #fff;
}
.revenue-summary small {
  display: block;
  color: #81766e;
}
.revenue-summary strong {
  display: block;
  margin-top: 8px;
  font-size: 22px;
  color: #aa1747;
}
.chart-card h3 {
  margin: 0 0 18px;
}
.bar-chart {
  height: 250px;
  display: flex;
  align-items: end;
  gap: 12px;
  overflow-x: auto;
  padding: 0 6px;
}
.bar-column {
  height: 100%;
  min-width: 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: end;
  gap: 6px;
}
.bar-value {
  font-size: 10px;
  color: #6f6259;
  white-space: nowrap;
}
.bar-track {
  height: 180px;
  width: 26px;
  background: #f6ecef;
  border-radius: 8px 8px 3px 3px;
  display: flex;
  align-items: end;
}
.bar-track i {
  display: block;
  width: 100%;
  background: #b51852;
  border-radius: 8px 8px 3px 3px;
}
@media (max-width: 700px) {
  .revenue-summary {
    grid-template-columns: 1fr;
  }
  .admin-profile {
    max-width: 170px;
    overflow: hidden;
    white-space: nowrap;
  }
}
.import-result {
  position: relative;
  display: grid;
  gap: 8px;
  margin: 0 0 18px;
  padding: 15px 44px 15px 16px;
  border: 1px solid #a7dfb7;
  border-radius: 10px;
  background: #effbf2;
  color: #185c2e;
}
.import-result b {
  font-size: 15px;
}
.import-result p {
  margin: 4px 0 0;
}
.import-result button {
  position: absolute;
  top: 9px;
  right: 10px;
  border: 0;
  background: transparent;
  color: #356144;
  font-size: 25px;
  cursor: pointer;
}
.import-result ul {
  margin: 0;
  padding-left: 19px;
  color: #83511b;
}
.import-result li {
  margin-top: 4px;
}
.import-result small {
  color: #83511b;
}
.expired-date {
  color: #b42318 !important;
  font-weight: 800;
}
.expired-tag {
  border-color: #f0b8b2 !important;
  background: #fff0ee;
  color: #b42318;
}
.dispose-button {
  margin-right: 7px;
  border: 0;
  border-radius: 6px;
  padding: 8px 10px;
  background: #b42318;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  font-size: 12px;
}
.batch-selection-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.batch-selection-actions b {
  color: #7f1d1d;
  font-size: 13px;
}
.batch-selection-actions button {
  border: 0;
  border-radius: 7px;
  padding: 9px 11px;
  background: #7f1d1d;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}
.batch-selection-actions button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.batch-selection-actions input {
  border: 1px solid #ded4ca;
  border-radius: 7px;
  padding: 10px;
  font: inherit;
  min-width: 250px;
}
@media (max-width: 900px) {
  .batch-selection-actions {
    justify-content: flex-start;
  }
  .batch-selection-actions input {
    min-width: 0;
    flex: 1;
  }
}
</style>
