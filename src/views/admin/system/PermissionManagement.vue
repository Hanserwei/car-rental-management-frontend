<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getSysController } from '@/api-client/src/api-client/sys-controller/sys-controller'
import type {
  SysPermissionVO,
  SysPermissionCreateRequest,
  PagePermissionsParams,
} from '@/api-client/src/api-client/models'
import type { TableProps } from 'ant-design-vue'

const sysController = getSysController()

// 表格数据
const dataSource = ref<SysPermissionVO[]>([])
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
const searchForm = reactive<PagePermissionsParams>({
  permissionName: undefined,
  permissionType: undefined,
  status: undefined,
  current: 1,
  pageSize: 10,
})

// 对话框状态
const modalVisible = ref(false)
const modalTitle = ref('新增权限')
const modalLoading = ref(false)
const isEditMode = ref(false)

// 表单数据
const formState = reactive({
  parentId: undefined,
  permissionName: '',
  permissionCode: '',
  permissionType: 3,
  routePath: '',
  component: '',
  icon: '',
  sortOrder: 0,
  status: 1,
  remark: '',
})

// 当前编辑的权限ID
const currentPermissionId = ref<number | null>(null)

// 表格列定义
const columns: TableProps['columns'] = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
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
    title: '权限类型',
    dataIndex: 'permissionType',
    key: 'permissionType',
    width: 100,
  },
  {
    title: '路由路径',
    dataIndex: 'routePath',
    key: 'routePath',
    width: 150,
    ellipsis: true,
  },
  {
    title: '排序',
    dataIndex: 'sortOrder',
    key: 'sortOrder',
    width: 80,
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
 * 获取权限列表
 */
const fetchPermissions = async () => {
  try {
    loading.value = true
    const params: PagePermissionsParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await sysController.pagePermissions(params)

    if (response.code === 200 && response.data) {
      dataSource.value = (response.data.records || []) as SysPermissionVO[]
      total.value = response.data.total || 0
      pagination.current = response.data.current || 1
    }
  } catch (error) {
    console.error('获取权限列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.current = 1
  fetchPermissions()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  searchForm.permissionName = undefined
  searchForm.permissionType = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchPermissions()
}

/**
 * 分页变化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchPermissions()
}

/**
 * 打开新增对话框
 */
const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增权限'
  resetForm()
  modalVisible.value = true
}

/**
 * 打开编辑对话框
 */
const handleEdit = async (record: SysPermissionVO) => {
  try {
    isEditMode.value = true
    modalTitle.value = '编辑权限'
    currentPermissionId.value = Number(record.id)

    // 获取权限详情
    const response = await sysController.getPermission(Number(record.id))
    if (response.code === 200 && response.data) {
      Object.assign(formState, {
        parentId: response.data.parentId,
        permissionName: response.data.permissionName,
        permissionCode: response.data.permissionCode,
        permissionType: response.data.permissionType,
        routePath: response.data.routePath,
        component: response.data.component,
        icon: response.data.icon,
        sortOrder: response.data.sortOrder,
        status: response.data.status,
        remark: response.data.remark,
      })
      modalVisible.value = true
    }
  } catch (error) {
    console.error('获取权限详情失败:', error)
  }
}

/**
 * 删除权限
 */
const handleDelete = (record: SysPermissionVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除权限"${record.permissionName}"吗？`,
    onOk: async () => {
      try {
        const response = await sysController.deletePermission(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchPermissions()
        }
      } catch (error) {
        console.error('删除权限失败:', error)
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

    if (isEditMode.value && currentPermissionId.value) {
      // 编辑权限
      const response = await sysController.updatePermission(currentPermissionId.value, formState)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchPermissions()
      }
    } else {
      // 新增权限
      const response = await sysController.createPermission(formState as SysPermissionCreateRequest)
      if (response.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        fetchPermissions()
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
  formState.parentId = undefined
  formState.permissionName = ''
  formState.permissionCode = ''
  formState.permissionType = 3
  formState.routePath = ''
  formState.component = ''
  formState.icon = ''
  formState.sortOrder = 0
  formState.status = 1
  formState.remark = ''
  currentPermissionId.value = null
}

// 组件挂载时获取数据
onMounted(() => {
  fetchPermissions()
})
</script>

<template>
  <div class="permission-management">
    <!-- 搜索栏 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="权限名称">
          <a-input
            v-model:value="searchForm.permissionName"
            placeholder="权限名称"
            allow-clear
            style="width: 200px"
          />
        </a-form-item>
        <a-form-item label="权限类型">
          <a-select
            v-model:value="searchForm.permissionType"
            placeholder="请选择"
            allow-clear
            style="width: 120px"
          >
            <a-select-option :value="1">目录</a-select-option>
            <a-select-option :value="2">菜单</a-select-option>
            <a-select-option :value="3">按钮/接口</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="searchForm.status"
            placeholder="请选择"
            allow-clear
            style="width: 120px"
          >
            <a-select-option :value="1">启用</a-select-option>
            <a-select-option :value="0">禁用</a-select-option>
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
        <a-button type="primary" @click="handleAdd">新增权限</a-button>
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
          <template v-if="column.key === 'permissionType'">
            <a-tag v-if="record.permissionType === 1" color="purple">目录</a-tag>
            <a-tag v-else-if="record.permissionType === 2" color="blue">菜单</a-tag>
            <a-tag v-else color="cyan">按钮/接口</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag v-if="record.status === 1" color="success">启用</a-tag>
            <a-tag v-else color="error">禁用</a-tag>
          </template>
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
      width="600px"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form :model="formState" layout="vertical">
        <a-form-item label="权限名称" name="permissionName">
          <a-input v-model:value="formState.permissionName" placeholder="请输入权限名称" />
        </a-form-item>
        <a-form-item label="权限编码" name="permissionCode">
          <a-input v-model:value="formState.permissionCode" placeholder="请输入权限编码" />
        </a-form-item>
        <a-form-item label="权限类型" name="permissionType">
          <a-radio-group v-model:value="formState.permissionType">
            <a-radio :value="1">目录</a-radio>
            <a-radio :value="2">菜单</a-radio>
            <a-radio :value="3">按钮/接口</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="父级ID" name="parentId">
          <a-input-number
            v-model:value="formState.parentId"
            placeholder="请输入父级ID"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="路由路径" name="routePath">
          <a-input v-model:value="formState.routePath" placeholder="请输入路由路径" />
        </a-form-item>
        <a-form-item label="组件路径" name="component">
          <a-input v-model:value="formState.component" placeholder="请输入组件路径" />
        </a-form-item>
        <a-form-item label="图标" name="icon">
          <a-input v-model:value="formState.icon" placeholder="请输入图标" />
        </a-form-item>
        <a-form-item label="排序" name="sortOrder">
          <a-input-number v-model:value="formState.sortOrder" :min="0" style="width: 100%" />
        </a-form-item>
        <a-form-item label="状态" name="status">
          <a-radio-group v-model:value="formState.status">
            <a-radio :value="1">启用</a-radio>
            <a-radio :value="0">禁用</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="备注" name="remark">
          <a-textarea v-model:value="formState.remark" placeholder="请输入备注" :rows="3" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.permission-management {
  /* 使用 Ant Design 原生样式 */
}
</style>
