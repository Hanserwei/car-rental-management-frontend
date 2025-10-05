// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import { defineConfig } from 'orval'

// noinspection JSUnusedGlobalSymbols
export default defineConfig({
  petstore: {
    input: {
      target: 'http://127.0.0.1:8088/api/v3/api-docs/default', // openapi 文档地址
    },
    output: {
      target: 'src/api-client/index.ts', // 生成请求函数
      schemas: 'src/api-client/models', // 生成的类型文件
      workspace: 'src/api-client', // 基础目录
      mode: 'tags-split', // 按 tags 拆分文件
      client: 'axios', // 使用 axios 作为请求库
      clean: false, // 每次生成前清空目录
      mock: false, // 是否生成 mock
      override: {
        mutator: {
          path: '../axios-instance.ts', // 自定义 axios 实例（相对 workspace）
          name: 'axiosInstance',
        },
      },
    },
    hooks: {
      afterAllFilesWrite: 'prettier --write ',
    },
  },
})
