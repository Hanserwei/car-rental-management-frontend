<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getSysController } from '@/api-client/src/api-client/sys-controller/sys-controller'
import type {
  SysUserRoleVO,
  SysUserRoleCreateRequest,
  SysUserRoleUpdateRequest,
  PageUserRolesParams,
  SysUserVO,
  SysRoleVO,
} from '@/api-client/src/api-client/models'
import type { TableProps } from 'ant-design-vue'

const sysController = getSysController()

// 表格数据
const dataSource = ref<SysUserRoleVO[]>([])
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
const searchForm = reactive<PageUserRolesParams>({
  userId: undefined,
  roleId: undefined,
  current: 1,
  pageSize: 10,
})

// 对话框状态
const modalVisible = ref(false)
const modalTitle = ref('新增用户角色关系')
const modalLoading = ref(false)
const isEditMode = ref(false)

// 表单数据
const formState = reactive({
  userId: undefined as number | undefined,
  roleId: undefined as number | undefined,
  newRoleId: undefined as number | undefined, // 用于更新时存储新角色ID
})

// 用户和角色列表（用于下拉选择）
const userList = ref<SysUserVO[]>([])
const roleList = ref<SysRoleVO[]>([])
const userListLoading = ref(false)
const roleListLoading = ref(false)

// 表格列定义
const columns: TableProps['columns'] = [
  {
    title: '用户ID',
    dataIndex: 'userId',
    key: 'userId',
    width: 100,
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
    width: 150,
  },
  {
    title: '角色ID',
    dataIndex: 'roleId',
    key: 'roleId',
    width: 100,
  },
  {
    title: '角色名称',
    dataIndex: 'roleName',
    key: 'roleName',
    width: 150,
  },
  {
    title: '角色编码',
    dataIndex: 'roleCode',
    key: 'roleCode',
    width: 150,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
  },
]

/**
 * 根据ID获取用户信息
 */
const getUserById = (userId: string | undefined) => {
  if (!userId) return null
  return userList.value.find((u) => u.id === userId)
}

/**
 * 根据ID获取角色信息
 */
const getRoleById = (roleId: string | undefined) => {
  if (!roleId) return null
  return roleList.value.find((r) => r.id === roleId)
}

/**
 * 获取用户角色关系列表
 */
const fetchUserRoles = async () => {
  try {
    loading.value = true
    const params: PageUserRolesParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await sysController.pageUserRoles(params)

    if (response.code === 200 && response.data) {
      const records = (response.data.records || []) as SysUserRoleVO[]
      // 为每条记录添加用户和角色的详细信息
      dataSource.value = records.map((record) => {
        const user = getUserById(record.userId)
        const role = getRoleById(record.roleId)
        return {
          ...record,
          username: user?.username,
          realName: user?.realName,
          roleName: role?.roleName,
          roleCode: role?.roleCode,
        }
      })
      total.value = response.data.total || 0
      pagination.current = response.data.current || 1
    }
  } catch (error) {
    console.error('获取用户角色关系列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 获取用户列表
 */
const fetchUserList = async () => {
  try {
    userListLoading.value = true
    const response = await sysController.pageUsers({ pageSize: 1000 })
    if (response.code === 200 && response.data) {
      userList.value = (response.data.records || []) as SysUserVO[]
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    userListLoading.value = false
  }
}

/**
 * 获取角色列表
 */
const fetchRoleList = async () => {
  try {
    roleListLoading.value = true
    const response = await sysController.pageRoles({ pageSize: 1000 })
    if (response.code === 200 && response.data) {
      roleList.value = (response.data.records || []) as SysRoleVO[]
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  } finally {
    roleListLoading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = async () => {
  pagination.current = 1
  // 确保用户和角色列表已加载
  if (userList.value.length === 0 || roleList.value.length === 0) {
    await Promise.all([fetchUserList(), fetchRoleList()])
  }
  await fetchUserRoles()
}

/**
 * 重置搜索
 */
const handleReset = async () => {
  searchForm.userId = undefined
  searchForm.roleId = undefined
  pagination.current = 1
  // 确保用户和角色列表已加载
  if (userList.value.length === 0 || roleList.value.length === 0) {
    await Promise.all([fetchUserList(), fetchRoleList()])
  }
  await fetchUserRoles()
}

/**
 * 分页变化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchUserRoles()
}

/**
 * 打开新增对话框
 */
const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增用户角色关系'
  resetForm()
  modalVisible.value = true
}

/**
 * 打开编辑对话框
 */
const handleEdit = (record: SysUserRoleVO) => {
  isEditMode.value = true
  modalTitle.value = '编辑用户角色关系'
  formState.userId = record.userId as unknown as number
  formState.roleId = record.roleId as unknown as number
  formState.newRoleId = undefined // 等待用户选择新角色
  modalVisible.value = true
}

/**
 * 删除用户角色关系
 */
const handleDelete = (record: SysUserRoleVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除该用户角色关系吗？`,
    onOk: async () => {
      try {
        const response = await sysController.deleteUserRole({
          userId: record.userId as unknown as number,
          roleId: record.roleId as unknown as number,
        })
        if (response.code === 200) {
          message.success('删除成功')
          fetchUserRoles()
        }
      } catch (error) {
        console.error('删除用户角色关系失败:', error)
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

    if (isEditMode.value) {
      // 编辑用户角色关系
      if (!formState.userId || !formState.roleId || !formState.newRoleId) {
        message.error('请填写完整信息')
        return
      }
      const updateData: SysUserRoleUpdateRequest = {
        userId: formState.userId,
        roleId: formState.roleId,
        newRoleId: formState.newRoleId,
      }
      const response = await sysController.updateUserRole(updateData)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchUserRoles()
      }
    } else {
      // 新增用户角色关系
      if (!formState.userId || !formState.roleId) {
        message.error('请填写完整信息')
        return
      }
      const createData: SysUserRoleCreateRequest = {
        userId: formState.userId,
        roleId: formState.roleId,
      }
      const response = await sysController.createUserRole(createData)
      if (response.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        fetchUserRoles()
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
  formState.userId = undefined
  formState.roleId = undefined
  formState.newRoleId = undefined
}

// 组件挂载时获取数据（先加载用户和角色列表，再加载关系列表）
onMounted(async () => {
  await Promise.all([fetchUserList(), fetchRoleList()])
  await fetchUserRoles()
})
</script>

<template>
  <div class="user-role-management">
    <!-- 搜索栏 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="用户ID">
          <a-input-number
            v-model:value="searchForm.userId"
            placeholder="用户ID"
            style="width: 200px"
            :min="1"
          />
        </a-form-item>
        <a-form-item label="角色ID">
          <a-input-number
            v-model:value="searchForm.roleId"
            placeholder="角色ID"
            style="width: 200px"
            :min="1"
          />
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
        <a-button type="primary" @click="handleAdd">新增用户角色关系</a-button>
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
        :scroll="{ x: 1000 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="handleEdit(record)">编辑</a-button>
              <a-button type="link" size="small" danger @click="handleDelete(record)">
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
        <a-form-item
          label="用户"
          name="userId"
          :rules="[{ required: true, message: '请选择用户' }]"
        >
          <a-select
            v-model:value="formState.userId"
            placeholder="请选择用户"
            :loading="userListLoading"
            show-search
            :filter-option="
              (input: string, option: any) => {
                const user = userList.find((u) => Number(u.id) === option.value)
                return user
                  ? user.username?.toLowerCase().includes(input.toLowerCase()) ||
                      user.realName?.toLowerCase().includes(input.toLowerCase())
                  : false
              }
            "
            :disabled="isEditMode"
          >
            <a-select-option v-for="user in userList" :key="user.id" :value="Number(user.id)">
              {{ user.username }} ({{ user.realName }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="!isEditMode"
          label="角色"
          name="roleId"
          :rules="[{ required: true, message: '请选择角色' }]"
        >
          <a-select
            v-model:value="formState.roleId"
            placeholder="请选择角色"
            :loading="roleListLoading"
            show-search
            :filter-option="
              (input: string, option: any) => {
                const role = roleList.find((r) => Number(r.id) === option.value)
                return role
                  ? role.roleCode?.toLowerCase().includes(input.toLowerCase()) ||
                      role.roleName?.toLowerCase().includes(input.toLowerCase())
                  : false
              }
            "
          >
            <a-select-option v-for="role in roleList" :key="role.id" :value="Number(role.id)">
              {{ role.roleName }} ({{ role.roleCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-else label="当前角色" name="roleId">
          <a-select
            v-model:value="formState.roleId"
            placeholder="当前角色"
            :loading="roleListLoading"
            disabled
          >
            <a-select-option v-for="role in roleList" :key="role.id" :value="Number(role.id)">
              {{ role.roleName }} ({{ role.roleCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="isEditMode"
          label="新角色"
          name="newRoleId"
          :rules="[{ required: true, message: '请选择新角色' }]"
        >
          <a-select
            v-model:value="formState.newRoleId"
            placeholder="请选择新角色"
            :loading="roleListLoading"
            show-search
            :filter-option="
              (input: string, option: any) => {
                const role = roleList.find((r) => Number(r.id) === option.value)
                return role
                  ? role.roleCode?.toLowerCase().includes(input.toLowerCase()) ||
                      role.roleName?.toLowerCase().includes(input.toLowerCase())
                  : false
              }
            "
          >
            <a-select-option v-for="role in roleList" :key="role.id" :value="Number(role.id)">
              {{ role.roleName }} ({{ role.roleCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped></style>
