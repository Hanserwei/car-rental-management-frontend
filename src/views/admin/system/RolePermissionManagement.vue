<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getSysController } from '@/api-client/src/api-client/sys-controller/sys-controller'
import type {
  SysRolePermissionVO,
  SysRolePermissionCreateRequest,
  SysRolePermissionUpdateRequest,
  PageRolePermissionsParams,
  SysRoleVO,
  SysPermissionVO,
} from '@/api-client/src/api-client/models'
import type { TableProps } from 'ant-design-vue'

const sysController = getSysController()

// 表格数据
const dataSource = ref<SysRolePermissionVO[]>([])
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
const searchForm = reactive<PageRolePermissionsParams>({
  roleId: undefined,
  permissionId: undefined,
  current: 1,
  pageSize: 10,
})

// 对话框状态
const modalVisible = ref(false)
const modalTitle = ref('新增角色权限关系')
const modalLoading = ref(false)
const isEditMode = ref(false)

// 表单数据
const formState = reactive({
  roleId: undefined as number | undefined,
  permissionId: undefined as number | undefined,
  newPermissionId: undefined as number | undefined, // 用于更新时存储新权限ID
})

// 角色和权限列表（用于下拉选择）
const roleList = ref<SysRoleVO[]>([])
const permissionList = ref<SysPermissionVO[]>([])
const roleListLoading = ref(false)
const permissionListLoading = ref(false)

// 表格列定义
const columns: TableProps['columns'] = [
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
    title: '权限ID',
    dataIndex: 'permissionId',
    key: 'permissionId',
    width: 100,
  },
  {
    title: '权限名称',
    dataIndex: 'permissionName',
    key: 'permissionName',
    width: 150,
  },
  {
    title: '权限编码',
    dataIndex: 'permissionCode',
    key: 'permissionCode',
    width: 200,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
  },
]

/**
 * 根据ID获取角色信息
 */
const getRoleById = (roleId: string | undefined) => {
  if (!roleId) return null
  return roleList.value.find((r) => r.id === roleId)
}

/**
 * 根据ID获取权限信息
 */
const getPermissionById = (permissionId: string | undefined) => {
  if (!permissionId) return null
  return permissionList.value.find((p) => p.id === permissionId)
}

/**
 * 获取角色权限关系列表
 */
const fetchRolePermissions = async () => {
  try {
    loading.value = true
    const params: PageRolePermissionsParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await sysController.pageRolePermissions(params)

    if (response.code === 200 && response.data) {
      const records = (response.data.records || []) as SysRolePermissionVO[]
      // 为每条记录添加角色和权限的详细信息
      dataSource.value = records.map((record) => {
        const role = getRoleById(record.roleId)
        const permission = getPermissionById(record.permissionId)
        return {
          ...record,
          roleName: role?.roleName,
          roleCode: role?.roleCode,
          permissionName: permission?.permissionName,
          permissionCode: permission?.permissionCode,
        }
      })
      total.value = response.data.total || 0
      pagination.current = response.data.current || 1
    }
  } catch (error) {
    console.error('获取角色权限关系列表失败:', error)
  } finally {
    loading.value = false
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
 * 获取权限列表
 */
const fetchPermissionList = async () => {
  try {
    permissionListLoading.value = true
    const response = await sysController.pagePermissions({ pageSize: 1000 })
    if (response.code === 200 && response.data) {
      permissionList.value = (response.data.records || []) as SysPermissionVO[]
    }
  } catch (error) {
    console.error('获取权限列表失败:', error)
  } finally {
    permissionListLoading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = async () => {
  pagination.current = 1
  // 确保角色和权限列表已加载
  if (roleList.value.length === 0 || permissionList.value.length === 0) {
    await Promise.all([fetchRoleList(), fetchPermissionList()])
  }
  await fetchRolePermissions()
}

/**
 * 重置搜索
 */
const handleReset = async () => {
  searchForm.roleId = undefined
  searchForm.permissionId = undefined
  pagination.current = 1
  // 确保角色和权限列表已加载
  if (roleList.value.length === 0 || permissionList.value.length === 0) {
    await Promise.all([fetchRoleList(), fetchPermissionList()])
  }
  await fetchRolePermissions()
}

/**
 * 分页变化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchRolePermissions()
}

/**
 * 打开新增对话框
 */
const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增角色权限关系'
  resetForm()
  modalVisible.value = true
}

/**
 * 打开编辑对话框
 */
const handleEdit = (record: SysRolePermissionVO) => {
  isEditMode.value = true
  modalTitle.value = '编辑角色权限关系'
  formState.roleId = record.roleId as unknown as number
  formState.permissionId = record.permissionId as unknown as number
  formState.newPermissionId = undefined // 等待用户选择新权限
  modalVisible.value = true
}

/**
 * 删除角色权限关系
 */
const handleDelete = (record: SysRolePermissionVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除该角色权限关系吗？`,
    onOk: async () => {
      try {
        const response = await sysController.deleteRolePermission({
          roleId: record.roleId as unknown as number,
          permissionId: record.permissionId as unknown as number,
        })
        if (response.code === 200) {
          message.success('删除成功')
          fetchRolePermissions()
        }
      } catch (error) {
        console.error('删除角色权限关系失败:', error)
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
      // 编辑角色权限关系
      if (!formState.roleId || !formState.permissionId || !formState.newPermissionId) {
        message.error('请填写完整信息')
        return
      }
      const updateData: SysRolePermissionUpdateRequest = {
        roleId: formState.roleId,
        permissionId: formState.permissionId,
        newPermissionId: formState.newPermissionId,
      }
      const response = await sysController.updateRolePermission(updateData)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchRolePermissions()
      }
    } else {
      // 新增角色权限关系
      if (!formState.roleId || !formState.permissionId) {
        message.error('请填写完整信息')
        return
      }
      const createData: SysRolePermissionCreateRequest = {
        roleId: formState.roleId,
        permissionId: formState.permissionId,
      }
      const response = await sysController.createRolePermission(createData)
      if (response.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        fetchRolePermissions()
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
  formState.roleId = undefined
  formState.permissionId = undefined
  formState.newPermissionId = undefined
}

// 组件挂载时获取数据（先加载角色和权限列表，再加载关系列表）
onMounted(async () => {
  await Promise.all([fetchRoleList(), fetchPermissionList()])
  await fetchRolePermissions()
})
</script>

<template>
  <div class="role-permission-management">
    <!-- 搜索栏 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="角色ID">
          <a-input-number
            v-model:value="searchForm.roleId"
            placeholder="角色ID"
            style="width: 200px"
            :min="1"
          />
        </a-form-item>
        <a-form-item label="权限ID">
          <a-input-number
            v-model:value="searchForm.permissionId"
            placeholder="权限ID"
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
        <a-button type="primary" @click="handleAdd">新增角色权限关系</a-button>
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
        :scroll="{ x: 1100 }"
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
            :disabled="isEditMode"
          >
            <a-select-option v-for="role in roleList" :key="role.id" :value="Number(role.id)">
              {{ role.roleName }} ({{ role.roleCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="!isEditMode"
          label="权限"
          name="permissionId"
          :rules="[{ required: true, message: '请选择权限' }]"
        >
          <a-select
            v-model:value="formState.permissionId"
            placeholder="请选择权限"
            :loading="permissionListLoading"
            show-search
            :filter-option="
              (input: string, option: any) => {
                const permission = permissionList.find((p) => Number(p.id) === option.value)
                return permission
                  ? permission.permissionCode?.toLowerCase().includes(input.toLowerCase()) ||
                      permission.permissionName?.toLowerCase().includes(input.toLowerCase())
                  : false
              }
            "
          >
            <a-select-option
              v-for="permission in permissionList"
              :key="permission.id"
              :value="Number(permission.id)"
            >
              {{ permission.permissionName }} ({{ permission.permissionCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-else label="当前权限" name="permissionId">
          <a-select
            v-model:value="formState.permissionId"
            placeholder="当前权限"
            :loading="permissionListLoading"
            disabled
          >
            <a-select-option
              v-for="permission in permissionList"
              :key="permission.id"
              :value="Number(permission.id)"
            >
              {{ permission.permissionName }} ({{ permission.permissionCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item
          v-if="isEditMode"
          label="新权限"
          name="newPermissionId"
          :rules="[{ required: true, message: '请选择新权限' }]"
        >
          <a-select
            v-model:value="formState.newPermissionId"
            placeholder="请选择新权限"
            :loading="permissionListLoading"
            show-search
            :filter-option="
              (input: string, option: any) => {
                const permission = permissionList.find((p) => Number(p.id) === option.value)
                return permission
                  ? permission.permissionCode?.toLowerCase().includes(input.toLowerCase()) ||
                      permission.permissionName?.toLowerCase().includes(input.toLowerCase())
                  : false
              }
            "
          >
            <a-select-option
              v-for="permission in permissionList"
              :key="permission.id"
              :value="Number(permission.id)"
            >
              {{ permission.permissionName }} ({{ permission.permissionCode }})
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped></style>
