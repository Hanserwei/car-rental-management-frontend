<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { getSysController } from '@/api-client/src/api-client/sys-controller/sys-controller'
import type {
  SysRoleVO,
  SysRoleCreateRequest,
  PageRolesParams,
} from '@/api-client/src/api-client/models'
import type { TableProps } from 'ant-design-vue'

const sysController = getSysController()

// 表格数据
const dataSource = ref<SysRoleVO[]>([])
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
const searchForm = reactive<PageRolesParams>({
  roleCode: undefined,
  roleName: undefined,
  status: undefined,
  current: 1,
  pageSize: 10,
})

// 对话框状态
const modalVisible = ref(false)
const modalTitle = ref('新增角色')
const modalLoading = ref(false)
const isEditMode = ref(false)

// 表单数据
const formState = reactive({
  roleCode: '',
  roleName: '',
  roleType: 1,
  dataScope: 1,
  sortOrder: 0,
  status: 1,
  remark: '',
})

// 当前编辑的角色ID
const currentRoleId = ref<number | null>(null)

// 表格列定义
const columns: TableProps['columns'] = [
  {
    title: 'ID',
    dataIndex: 'id',
    key: 'id',
    width: 80,
  },
  {
    title: '角色编码',
    dataIndex: 'roleCode',
    key: 'roleCode',
    width: 150,
  },
  {
    title: '角色名称',
    dataIndex: 'roleName',
    key: 'roleName',
    width: 150,
  },
  {
    title: '角色类型',
    dataIndex: 'roleType',
    key: 'roleType',
    width: 100,
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
    title: '备注',
    dataIndex: 'remark',
    key: 'remark',
    ellipsis: true,
  },
  {
    title: '操作',
    key: 'action',
    width: 180,
    fixed: 'right',
  },
]

/**
 * 获取角色列表
 */
const fetchRoles = async () => {
  try {
    loading.value = true
    const params: PageRolesParams = {
      ...searchForm,
      current: pagination.current,
      pageSize: pagination.pageSize,
    }
    const response = await sysController.pageRoles(params)

    if (response.code === 200 && response.data) {
      dataSource.value = (response.data.records || []) as SysRoleVO[]
      total.value = response.data.total || 0
      pagination.current = response.data.current || 1
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 搜索
 */
const handleSearch = () => {
  pagination.current = 1
  fetchRoles()
}

/**
 * 重置搜索
 */
const handleReset = () => {
  searchForm.roleCode = undefined
  searchForm.roleName = undefined
  searchForm.status = undefined
  pagination.current = 1
  fetchRoles()
}

/**
 * 分页变化
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleTableChange = (pag: any) => {
  pagination.current = pag.current
  pagination.pageSize = pag.pageSize
  fetchRoles()
}

/**
 * 打开新增对话框
 */
const handleAdd = () => {
  isEditMode.value = false
  modalTitle.value = '新增角色'
  resetForm()
  modalVisible.value = true
}

/**
 * 打开编辑对话框
 */
const handleEdit = async (record: SysRoleVO) => {
  try {
    isEditMode.value = true
    modalTitle.value = '编辑角色'
    currentRoleId.value = Number(record.id)

    // 获取角色详情
    const response = await sysController.getRole(Number(record.id))
    if (response.code === 200 && response.data) {
      Object.assign(formState, {
        roleCode: response.data.roleCode,
        roleName: response.data.roleName,
        roleType: response.data.roleType,
        dataScope: response.data.dataScope,
        sortOrder: response.data.sortOrder,
        status: response.data.status,
        remark: response.data.remark,
      })
      modalVisible.value = true
    }
  } catch (error) {
    console.error('获取角色详情失败:', error)
  }
}

/**
 * 删除角色
 */
const handleDelete = (record: SysRoleVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除角色"${record.roleName}"吗？`,
    onOk: async () => {
      try {
        const response = await sysController.deleteRole(Number(record.id))
        if (response.code === 200) {
          message.success('删除成功')
          fetchRoles()
        }
      } catch (error) {
        console.error('删除角色失败:', error)
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

    if (isEditMode.value && currentRoleId.value) {
      // 编辑角色
      const response = await sysController.updateRole(currentRoleId.value, formState)
      if (response.code === 200) {
        message.success('更新成功')
        modalVisible.value = false
        fetchRoles()
      }
    } else {
      // 新增角色
      const response = await sysController.createRole(formState as SysRoleCreateRequest)
      if (response.code === 200) {
        message.success('创建成功')
        modalVisible.value = false
        fetchRoles()
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
  formState.roleCode = ''
  formState.roleName = ''
  formState.roleType = 1
  formState.dataScope = 1
  formState.sortOrder = 0
  formState.status = 1
  formState.remark = ''
  currentRoleId.value = null
}

// 组件挂载时获取数据
onMounted(() => {
  fetchRoles()
})
</script>

<template>
  <div class="role-management">
    <!-- 搜索栏 -->
    <a-card :bordered="false" style="margin-bottom: 16px">
      <a-form layout="inline">
        <a-form-item label="角色编码">
          <a-input
            v-model:value="searchForm.roleCode"
            placeholder="角色编码"
            allow-clear
            style="width: 150px"
          />
        </a-form-item>
        <a-form-item label="角色名称">
          <a-input
            v-model:value="searchForm.roleName"
            placeholder="角色名称"
            allow-clear
            style="width: 150px"
          />
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
        <a-button type="primary" @click="handleAdd">新增角色</a-button>
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
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'roleType'">
            <a-tag v-if="record.roleType === 1" color="red">后台</a-tag>
            <a-tag v-else-if="record.roleType === 2" color="blue">前台</a-tag>
            <a-tag v-else color="green">通用</a-tag>
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
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form :model="formState" layout="vertical">
        <a-form-item label="角色编码" name="roleCode">
          <a-input
            v-model:value="formState.roleCode"
            placeholder="请输入角色编码"
            :disabled="isEditMode"
          />
        </a-form-item>
        <a-form-item label="角色名称" name="roleName">
          <a-input v-model:value="formState.roleName" placeholder="请输入角色名称" />
        </a-form-item>
        <a-form-item label="角色类型" name="roleType">
          <a-radio-group v-model:value="formState.roleType">
            <a-radio :value="1">后台</a-radio>
            <a-radio :value="2">前台</a-radio>
            <a-radio :value="3">通用</a-radio>
          </a-radio-group>
        </a-form-item>
        <a-form-item label="数据范围" name="dataScope">
          <a-input-number v-model:value="formState.dataScope" :min="1" style="width: 100%" />
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

<style scoped></style>
