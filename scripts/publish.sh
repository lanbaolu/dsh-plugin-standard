#!/usr/bin/env bash
# 固定发布方式：官方 npm registry + public 访问。
#
# 用法：
#   ./scripts/publish.sh                  # 正常发布（可能触发 OTP 浏览器认证）
#   ./scripts/publish.sh --otp <code>     # 已拿到 OTP 码时直接传
#
# 注意：默认 registry 是 npmmirror，发布必须显式 --registry https://registry.npmjs.org。
# OTP（一次性密码）认证由用户本人完成，agent 不代输。
set -euo pipefail
cd "$(dirname "$0")/.."

if ! npm whoami --registry https://registry.npmjs.org >/dev/null 2>&1; then
  echo "尚未登录官方 registry。请先执行：npm login --registry https://registry.npmjs.org" >&2
  exit 1
fi

echo "=== 发布前自检（fixtures 回归）==="
npm test || {
  echo "规范包自测未通过，中止发布" >&2
  exit 1
}

echo "=== npm publish（官方 registry）==="
npm publish --registry https://registry.npmjs.org --access public "$@"
echo "=== 发布完成 ==="
