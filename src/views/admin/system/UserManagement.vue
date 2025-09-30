<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getSysController } from '@/api-client/src/api-client/sys-controller/sys-controller'
import type {
  SysUserVO,
  SysUserCreateRequest,
  SysUserUpdateRequest,
  PageUsersParams,
} from '@/api-client/src/api-client/models'
import type { TableProps } from 'ant-design-vue'

const sysController = getSysController()

// 表格数据
const dataSource = ref<SysUserVO[]>([])
const loading = ref(false)
const total = ref(0)

// 分页参数
const pagination = reactive({
  current: 1,
  pageSize: 10,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
})

// 搜索表单
const searchForm = reactive<PageUsersParams>({
  keyword: undefined,
  status: undefined,
  userType: undefined,
  current: 1,
  pageSize: 10,
})

// 对话框状态
const modalVisible = ref(false)
const modalTitle = ref('新增用户')
const modalLoading = ref(false)
const isEditMode = ref(false)

// 表单数据
const formState = reactive({
  username: '',
  password: '',
  nickname: '',
  realName: '',
  email: '',
  mobile: '',
  gender: '0',
  userType: '2',
  status: '1',
})

// 当前编辑的用户ID
const currentUserId = ref<number | null>(null)

// 表格列定义
const columns: TableProps['columns'] = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '用户名',
    dataIndex: 'username',
    key: 'username',
    width: 150,
  },
  {
    title: '真实姓名',
    dataIndex: 'realName',
    key: 'realName',
    width: 120,
  },
  {
    title: '昵称',
    dataIndex: 'nickname',
    key: 'nickname',
    width: 120,
  },
  {
    title: '邮箱',
    dataIndex: 'email',
    key: 'email',
    width: 180,
  },
  {
    title: '手机号',
    dataIndex: 'mobile',
    key: 'mobile',
    width: 130,
  },
  {
    title: '性别',
    dataIndex: 'gender',
    key: 'gender',
    width: 80,
  },
  {
    title: '用户类型',
    dataIndex: 'userType',
    key: 'userType',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
  },
]

/**
 * 获取用户列表
 */
const fetchUsers = async () => {
  try {
    loading.value = true
    const params: PageUsersParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await sysController.pageUsers(params)

    if (response.code === 200 && response.data) {
      dataSource.value = (response.data.records || []) as SysUserVO[]
      total.value = response.data.total || 0
      pagination.current = response.data.current || 1
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.current = 1
  fetchUsers()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  searchForm.keyword = undefined
  searchForm.status = undefined
  searchForm.userType = undefined
  pagination.current = 1
  fetchUsers()
}

/**
 * 分页变化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchUsers()
}

/**
 * 打开新增对话框
 */
const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增用户'
  resetForm()
  modalVisible.value = true
}

/**
 * 打开编辑对话框
 */
const handleEdit = async (record: SysUserVO) => {
  try {
    isEditMode.value = true
    modalTitle.value = '编辑用户'
    currentUserId.value = record.id as unknown as number

    // 获取用户详情
    const response = await sysController.getUser(record.id as unknown as number)
    if (response.code === 200 && response.data) {
      Object.assign(formState, {
        username: response.data.username,
        nickname: response.data.nickname,
        realName: response.data.realName,
        email: response.data.email,
        mobile: response.data.mobile,
        gender: response.data.gender,
        userType: response.data.userType,
        status: response.data.status,
      })
      modalVisible.value = true
    }
  } catch (error) {
    console.error('获取用户详情失败:', error)
  }
}

/**
 * 删除用户
 */
const handleDelete = (record: SysUserVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除用户"${record.username}"吗？`,
    onOk: async () => {
      try {
        const response = await sysController.deleteUser(record.id as unknown as number)
        if (response.code === 200) {
          message.success('删除成功')
          fetchUsers()
        }
      } catch (error) {
        console.error('删除用户失败:', error)
      }
    },
  })
}

/**
 * 提交表单
 */
const handleSubmit = async () => {
  try {
    modalLoading.value = true

    if (isEditMode.value && currentUserId.value) {
      // 编辑用户
      const updateData: SysUserUpdateRequest = {
        nickname: formState.nickname,
        realName: formState.realName,
        email: formState.email,
        mobile: formState.mobile,
        gender: formState.gender,
        userType: formState.userType,
        status: formState.status,
      }
      const response = await sysController.updateUser(currentUserId.value!, updateData)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchUsers()
      }
    } else {
      // 新增用户
      const createData: SysUserCreateRequest = {
        username: formState.username,
        password: formState.password,
        nickname: formState.nickname,
        realName: formState.realName,
        email: formState.email,
        mobile: formState.mobile,
        gender: formState.gender,
        userType: formState.userType,
        status: formState.status,
      }
      const response = await sysController.createUser(createData)
      if (response.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        fetchUsers()
      }
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    modalLoading.value = false
  }
}

/**
 * 取消
 */
const handleCancel = () => {
  modalVisible.value = false
  resetForm()
}

/**
 * 重置表单
 */
const resetForm = () => {
  formState.username = ''
  formState.password = ''
  formState.nickname = ''
  formState.realName = ''
  formState.email = ''
  formState.mobile = ''
  formState.gender = '0'
  formState.userType = '2'
  formState.status = '1'
  currentUserId.value = null
}

// 组件挂载时获取数据
onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="user-management">
    <!-- 搜索栏 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="关键字">
          <a-input
            v-model:value="searchForm.keyword"
            placeholder="用户名/昵称"
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="searchForm.status"
            placeholder="请选择"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="1">启用</a-select-option>
            <a-select-option value="0">禁用</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="用户类型">
          <a-select
            v-model:value="searchForm.userType"
            placeholder="请选择"
            allow-clear
            style="width: 120px"
          >
            <a-select-option value="1">管理员</a-select-option>
            <a-select-option value="2">普通用户</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 操作栏 -->
    <a-card :bordered="false">
      <div style="margin-bottom: 16px">
        <a-button type="primary" v-permission="'account:user:update'" @click="handleAdd">
          新增用户
        </a-button>
      </div>

      <!-- 表格 -->
      <a-table
        :columns="columns"
        :data-source="dataSource"
        :loading="loading"
        :pagination="{
          ...pagination,
          total,
        }"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'gender'">
            <a-tag v-if="record.gender === '1'" color="blue">男</a-tag>
            <a-tag v-else-if="record.gender === '2'" color="pink">女</a-tag>
            <a-tag v-else color="default">未知</a-tag>
          </template>
          <template v-if="column.key === 'userType'">
            <a-tag v-if="record.userType === '1'" color="red">管理员</a-tag>
            <a-tag v-else color="blue">普通用户</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === '1'" color="success">启用</a-tag>
            <a-tag v-else color="error">禁用</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button
                type="primary"
                size="small"
                v-permission="'account:user:update'"
                @click="handleEdit(record)"
              >
                编辑
              </a-button>
              <a-button
                type="primary"
                size="small"
                danger
                v-permission="'account:user:delete'"
                @click="handleDelete(record)"
              >
                删除
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 新增/编辑对话框 -->
    <a-modal
      v-model:open="modalVisible"
      :title="modalTitle"
      :confirm-loading="modalLoading"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form :model="formState" layout="vertical">
        <a-form-item label="用户名" name="username" v-if="!isEditMode">
          <a-input v-model:value="formState.username" placeholder="请输入用户名" />
        </a-form-item>
        <a-form-item label="密码" name="password" v-if="!isEditMode">
          <a-input-password v-model:value="formState.password" placeholder="请输入密码" />
        </a-form-item>
        <a-form-item label="真实姓名" name="realName">
          <a-input v-model:value="formState.realName" placeholder="请输入真实姓名" />
        </a-form-item>
        <a-form-item label="昵称" name="nickname">
          <a-input v-model:value="formState.nickname" placeholder="请输入昵称" />
        </a-form-item>
        <a-form-item label="邮箱" name="email">
          <a-input v-model:value="formState.email" placeholder="请输入邮箱" />
        </a-form-item>
        <a-form-item label="手机号" name="mobile">
          <a-input v-model:value="formState.mobile" placeholder="请输入手机号" />
        </a-form-item>
        <a-form-item label="性别" name="gender">
          <a-radio-group v-model:value="formState.gender">
            <a-radio value="0">未知</a-radio>
            <a-radio value="1">男</a-radio>
            <a-radio value="2">女</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="用户类型" name="userType">
          <a-radio-group v-model:value="formState.userType">
            <a-radio value="2">普通用户</a-radio>
            <a-radio value="1">管理员</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="formState.status">
            <a-radio value="1">启用</a-radio>
            <a-radio value="0">禁用</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped></style>
