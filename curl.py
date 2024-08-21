import requests 
url = "https://api.pangxie.link/v1/chat/completions" 
contentType = "application/json"
auth = ""

headers = {
    "Content-Type": contentType,
    "Authorization": auth,
}
body = {
    "model": "claude-3.5-sonnet-20240620",
    "max_tokens": 1024,
    "temperature": 0.01,
    "stop": ["func","package","import","type","/src/","#- coding: utf-8","```"],
    "messages": [
      {
        "role": "user",
        "content": "You are a helpful assistant."
      }
    ]
}

content = """
You are a HOLE FILLER. You are provided with a file containing holes, formatted as '{{HOLE_NAME}}'. Your TASK is to complete with a string to replace this hole with, inside a <COMPLETION/> XML tag, including context-aware indentation, if needed.  All completions MUST be truthful, accurate, well-written and correct.

## EXAMPLE QUERY:

<QUERY>
function sum_evens(lim) {
  var sum = 0;
  for (var i = 0; i < lim; ++i) {
    {{FILL_HERE}}
  }
  return sum;
}
</QUERY>

TASK: Fill the {{FILL_HERE}} hole.

## CORRECT COMPLETION

<COMPLETION>if (i % 2 === 0) {
      sum += i;
    }</COMPLETION>

## EXAMPLE QUERY:

<QUERY>
def sum_list(lst):
  total = 0
  for x in lst:
  {{FILL_HERE}}
  return total

print sum_list([1, 2, 3])
</QUERY>

## CORRECT COMPLETION:

<COMPLETION>  total += x</COMPLETION>

## EXAMPLE QUERY:

<QUERY>
// data Tree a = Node (Tree a) (Tree a) | Leaf a

// sum :: Tree Int -> Int
// sum (Node lft rgt) = sum lft + sum rgt
// sum (Leaf val)     = val

// convert to TypeScript:
{{FILL_HERE}}
</QUERY>

## CORRECT COMPLETION:

<COMPLETION>type Tree<T>
  = {$:"Node", lft: Tree<T>, rgt: Tree<T>}
  | {$:"Leaf", val: T};

function sum(tree: Tree<number>): number {
  switch (tree.$) {
    case "Node":
      return sum(tree.lft) + sum(tree.rgt);
    case "Leaf":
      return tree.val;
  }
}</COMPLETION>

## EXAMPLE QUERY:

The 5th {{FILL_HERE}} is Jupiter.

## CORRECT COMPLETION:

<COMPLETION>planet from the Sun</COMPLETION>

## EXAMPLE QUERY:

function hypothenuse(a, b) {
  return Math.sqrt({{FILL_HERE}}b ** 2);
}

## CORRECT COMPLETION:

<COMPLETION>a ** 2 + </COMPLETION>

<QUERY>
				data.Same = append(data.Same, log)
			}
		}
		logData = append(logData, &data)
	}
	sort.Slice(logData, func(i, j int) bool {
		return len(logData[i].Same) > len(logData[j].Same)
	})
	return logData
}

// ------------------ kae get log ----------------------------

// @path /api/v1/project/:kae_project/kae/logreduce
// @middleware {self}.Monitor.ApiMonitor {self}.Auth.Login {self}.Monitor.ActivityCount
// @middleware {self}.Auditlog.Record
// @middleware {self}.Auth.CheckKaeProject
// @middleware AuditSetTitle("GetLogReduce")
// @middleware AuditSetMsg("获取应用日志聚类结果")
type KaeLogReduce struct {
	Manager  *dao.Manager
	Monitor  *Monitor
	Auth     *Auth
	Auditlog *AuditLog
}

func (a *KaeLogReduce) POST(ctx context.Context, uri *CommonUri, query *models.LogRequceQuery, body *models.KaeGetLogsReq) (*models.LogReduceResp, error) {
	var cost models.LogReduceCost
	allStart := time.Now()
	proj, err := a.Manager.ProjectDao.GetProject(ctx, uri.KaeProject)
	if err != nil {
		return nil, err
	}
	if body.Storage == "" {
		storage, err := a.Manager.GetStorageByAppKey(ctx, proj.Key, body.LogInstance)
		if err != nil {
			return nil, tools.ErrWrap(err)
		}
		body.Storage = storage.Name()
	}
	params := models.KaeGetLogsReqToGetLogsParam(body, proj.Key)
	var result *dao.GetLogResult
	{
		getLogsStart := time.Now()
		result, err = a.Manager.GetLogs(ctx, *params)
		if err != nil {
			return nil, err
		}
		cost.StorageCostTime = time.Since(getLogsStart).Truncate(time.Millisecond).String()
	}
	aggrStart := time.Now()
	logreudceField := query.Field
	if logreudceField == "" {
		logreudceField = "message"
	}
	logData := logReduceProcess(result, logreudceField)
	cost.AggregateCostTime = time.Since(aggrStart).Truncate(time.Millisecond).String()

	cost.AllCostTime = time.Since(allStart).Truncate(time.Millisecond).String()
	return models.GetLogResultToLogReduceResp(result, logData, cost, params.Start, params.End), nil
}

// -------------------- project logreduce ----------------------

// @path /api/v1/project/:kae_project/logreduce
// @middleware {self}.Monitor.ApiMonitor {self}.Auth.Login {self}.Monitor.ActivityCount
// @middleware {self}.Auditlog.Record
// @middleware {self}.Auth.CheckKaeProject
// @middleware AuditSetTitle("GetLogReduce")
// @middleware AuditSetMsg("获取团队聚类结果")
type ProjectLogReduce struct {
	Manager  *dao.Manager
	Monitor  *Monitor
	Auth     *Auth
	Auditlog *AuditLog
}

func (h *ProjectLogReduce) POST(ctx context.Context, uri *CommonUri, query *models.LogRequceQuery, body *models.PoolGetLogsReq) (*models.LogReduceResp, error) {
	proj, err := h.Manager.ProjectDao.GetProject(ctx, uri.KaeProject)
	if err != nil {
		return nil, tools.ErrWrap(err)
	}
	var cost models.LogReduceCost
	allStart := time.Now()
	param := models.PoolGetLogsReqToGetLogsParam(body, proj.Key)
	var result *dao.GetLogResult
	{
		getLogsStart := time.Now()
		result, err = h.Manager.GetLogs(ctx, *param)
		if err != nil {
			return nil, tools.ErrWrap(err)
		}
		cost.StorageCostTime = time.Since(getLogsStart).Truncate(time.Millisecond).String()
	} 
	aggrStart := time.{{FILL_HERE}}
	logreudceField := query.Field
	if logreudceField == "" {
		logreudceField = "message"
	}
	logData := logReduceProcess(result, logreudceField)
	cost.AggregateCostTime = time.Since(aggrStart).Truncate(time.Millisecond).String()

	cost.AllCostTime = time.Since(allStart).Truncate(time.Millisecond).String()

	return models.GetLogResultToLogReduceResp(result, logData, cost, param.Start, param.End), nil
}

// ---------------------- kae namespace logreduce ----------------------

</QUERY>
TASK: Fill the {{FILL_HERE}} hole. Answer only with the CORRECT completion, and NOTHING ELSE. Do it now.

"""

body["messages"][0]["content"] = content

resp = requests.post(url=url,headers=headers,json=body)
data = resp.json()
import json
vv = json.dumps(data)
print(vv)