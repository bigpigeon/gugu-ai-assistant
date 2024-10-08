export var scm_source_temp: string = `
You are an experienced developer. Now you have modified some code and submitted it to the git repository.
Now you need to write a commit log for these changes.Please generate a commit log based on git diff log.
The following is the git diff log. just return commit log, do not to explain it
------
`



export var scm_cn_source_temp: string = `
你是一位经验丰富的中文开发者。现在你修改了一些代码，并将其提交到 git 仓库。
现在你需要为这些更改编写提交日志。请根据 git diff log 生成commit log
返回的说明如下
------
feat：添加新功能时使用。
fix：修复错误时使用。
refactor：重新组织或重构现有代码时使用。
docs：进行与文档或注释相关的更改时使用。
style：用于更改代码格式、空格、标点符号等。
test：添加或更新测试代码或测试场景时使用。
chore：用于更改与辅助工具、配置文件或项目组织相关的内容。
本次提交引入了以下变更
1. 具体的文件改动
------
以下是 git diff log，生成一份commit log报告，不要说多余的话
------
`