# git

## git 地址 <https://github.com/lu76932038-jpg/ant-tl-ts.git>

## 初始化Git

git init

1. 合并分支到主分支 (main)
在归档前，必须将测试成功的代码合并到主干中。请在终端执行：

切换回主分支：git checkout main

确保主分支最新：git pull origin main

合并测试分支：git merge 测试服务器迁移

将合并后的代码推送到云端：git push origin main

1. 删除已完成的分支
代码合并成功后，可以清理掉这个临时分支：

删除本地分支：git branch -d 测试服务器迁移

删除 GitHub 上的远程分支：git push origin --delete 测试服务器迁移

第一部分：由你执行（创建并上传分支）

1. 创建并切换到新分支： git checkout -b 测试服务器迁移

2. 将新分支推送到 GitHub： git push -u origin 测试服务器迁移

第二部分：由其他开发人员执行（下载分支）
如果他们已经有你之前的代码，请执行： git fetch origin git checkout 测试服务器迁移

如果他们是第一次下载这个项目： git clone -b 测试服务器迁移

第三部分：日常修改代码后的三部曲
以后你在“测试服务器迁移”分支上改了代码，请执行：

git add .

git commit -m "你的修改说明"

git push origin 测试服务器迁移
