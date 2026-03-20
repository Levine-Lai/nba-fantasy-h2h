"""
项目配置文件
包含所有配置项：API设置、用户映射、赛程等

AI修改指引：
- 修改联盟ID: 修改 LEAGUE_ID
- 修改用户映射: 修改 UID_MAP
- 修改赛程: 修改 FIXTURES_GW*
"""

# ==================== API 配置 ====================

LEAGUE_ID = 1653
CURRENT_PHASE = 23
BASE_URL = "https://nbafantasy.nba.com/api"

# ==================== 缓存配置 ====================

CACHE_DIR = "./cache"
STATIC_JSON = f"{CACHE_DIR}/bootstrap_static.json"
TEAMS_CSV = f"{CACHE_DIR}/teams.csv"
PLAYERS_CSV = f"{CACHE_DIR}/players.csv"

# ==================== 位置映射 ====================

POSITION_MAP = {1: 'BC', 2: 'FC'}

# ==================== 用户映射 ====================
# 格式: UID: "显示名称"

UID_MAP = {
    5410: "kusuri", 3455: "Paul", 32: "伍家辉", 4319: "Kimi", 17: "堡", 
    2: "大吉鲁", 10: "弗老大", 14: "酸男", 6: "紫葱酱", 189: "凯文", 
    9: "雕哥", 4224: "班班", 22761: "纪导", 4: "尼弟", 16447: "文史哲", 
    6562: "柯南", 23: "橘队", 11: "船哥", 5101: "鬼嗨", 6441: "马哥", 
    15: "笨笨", 5095: "AI", 5467: "老姜", 6412: "阿甘", 8580: "小火龙", 42: "桑迪"
}
NAME_TO_UID = {v: k for k, v in UID_MAP.items()}

# ==================== 赛程配置 ====================
# 格式: ("玩家1", "玩家2")

FIXTURES_GW22 = [
    ("AI", "纪导"), ("弗老大", "柯南"), ("凯文", "大吉鲁"), ("Kimi", "酸男"),
    ("kusuri", "鬼嗨"), ("马哥", "阿甘"), ("Paul", "老姜"), ("桑迪", "紫葱酱"),
    ("伍家辉", "笨笨"), ("堡", "班班"), ("小火龙", "橘队"), ("尼弟", "文史哲"), ("雕哥", "船哥")
]

# FDR 数据 (赛程难度排行)
FDR_HTML = """<tr><td class='t-name'>尼弟</td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td class='avg-col'>2.0</td></tr>
<tr><td class='t-name'>堡</td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>雕哥</td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td class='avg-col'>2.25</td></tr>
<tr><td class='t-name'>Paul</td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>文史哲</td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>小火龙</td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td><div class='box fdr-4'>堡</div></td><td class='avg-col'>2.5</td></tr>
<tr><td class='t-name'>弗老大</td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>Kusuri</td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>马哥</td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>伍家辉</td><td><div class='box fdr-5'>笨笨</div></td><td><div class='box fdr-2'>橘队</div></td><td><div class='box fdr-2'>船哥</div></td><td><div class='box fdr-2'>尼弟</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>橘队</td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>船哥</td><td><div class='box fdr-3'>雕哥</div></td><td><div class='box fdr-1'>小火龙</div></td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td class='avg-col'>2.75</td></tr>
<tr><td class='t-name'>大吉鲁</td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>AI</td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-4'>酸男</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>桑迪</td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td><div class='box fdr-2'>文史哲</div></td><td><div class='box fdr-3'>雕哥</div></td><td class='avg-col'>3.0</td></tr>
<tr><td class='t-name'>笨笨</td><td><div class='box fdr-2'>伍家辉</div></td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>Kimi</td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td><div class='box fdr-4'>紫葱酱</div></td><td><div class='box fdr-3'>班班</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>紫葱酱</td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>班班</td><td><div class='box fdr-4'>堡</div></td><td><div class='box fdr-1'>桑迪</div></td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>鬼嗨</td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>纪导</td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>阿甘</td><td><div class='box fdr-3'>马哥</div></td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>老姜</td><td><div class='box fdr-5'>Paul</div></td><td><div class='box fdr-3'>Kusuri</div></td><td><div class='box fdr-3'>凯文</div></td><td><div class='box fdr-2'>纪导</div></td><td class='avg-col'>3.25</td></tr>
<tr><td class='t-name'>酸男</td><td><div class='box fdr-5'>Kimi</div></td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-1'>柯南</div></td><td><div class='box fdr-4'>AI</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>凯文</td><td><div class='box fdr-5'>大吉鲁</div></td><td><div class='box fdr-3'>鬼嗨</div></td><td><div class='box fdr-1'>老姜</div></td><td><div class='box fdr-5'>笨笨</div></td><td class='avg-col'>3.5</td></tr>
<tr><td class='t-name'>柯南</td><td><div class='box fdr-4'>弗老大</div></td><td><div class='box fdr-4'>AI</div></td><td><div class='box fdr-4'>酸男</div></td><td><div class='box fdr-2'>阿甘</div></td><td class='avg-col'>3.5</td></tr>"""
