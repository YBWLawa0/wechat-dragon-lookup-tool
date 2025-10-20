<template>
<div class="container">
  <h1 class="title">微信接龙名单对比工具</h1>
  <a href="http://y.cd122.com" target="_blank" class="blog-link">作者:YBWLawa0</a>
</div>

<div class="input-container">
  <div class="input-area">
    <label class="input-label">完整名单(每行一人)</label>
    <textarea v-model="fullListText" class="list-input" placeholder="例:
    王xx
    张xx
    吴xx
    李xx
    ...
    " rows="15"></textarea>
    <p class="count-info">有效人数:{{ fullList.length }}</p>
  </div>

  <div class="input-area">
    <label class="input-label">原始接龙文本(直接复制粘贴)</label>
    <textarea 
    v-model="prevText"
    class="list-input"
    placeholder="直接复制微信接龙内容，支持带标题、序号、后缀..."
    rows="15"></textarea>
    <p class="count-info">成功获取人数:{{ cleanedList.length }}</p>
    <p class="tip">已自动去除标题、序号、部分后缀</p>
  </div>
</div>

<button class="compare-button" @click="compareLists":disabled="isComparing||!fullList.length||!cleanedList.length">
   {{ isComparing ? '对比中...' : '点击开始比对' }}
</button>

<div class="result-area" v-if="showResult">
  <h2 class="result-title">对比结果</h2>
  <div class="result-stats">
    <p>完整名单总人数:{{ fullList.length }}</p>
    <p>接龙文本整理后总人数:{{ cleanedList.length }}</p>
    <p>重复接龙人数:{{ duplicateCount }}</p>
    <p>缺失人数{{ missingList.length }}</p>
  </div>
</div>

 <div class="similar-area" v-if="similarList.length > 0">
    <h3 class="similar-title">
      疑似相似姓名（需人工核对）
      <span class="count-badge">{{ similarList.length }}</span>
    </h3>
    <ul class="similar-list">
      <li v-for="(item, index) in similarList" :key="index" class="similar-item">
        完整名单: <span class="full-name">{{ item.fullName }}</span> 
        ↔ 接龙名单: <span class="接龙-name">{{ item.PrevName }}</span>
        <span class="similarity-tag">相似度:{{ item.similarity }}%</span>
      </li>
    </ul>
  </div>

<div class="missing-area">
  <h3 class="missing-title">
    未接龙人员
    <span class="count-badge">{{ missingList.length }}</span>
  </h3>
 
  <div v-if="missingList.length ===0" class="no-missing">所有人员均已接龙，无缺失</div>
  <ul class="missing-list" v-else>
    <li v-for="(name,index) in missingList":key="index" class="missing-item">
        {{ index+1 }}.{{ name }}
    </li>
  </ul>
  </div>

  <div class="cleaned-list-area">
    <h3 class="cleaned-title">
      整理后的接龙名单
      <span class="count-badge">{{ cleanedList.length }}</span>
    </h3>
    <ul class="cleaned-list">
      <li v-for="(name,index) in cleanedList":key="index" class="cleaned-item">
        {{ index+1 }}.{{ name }}
      </li>
    </ul>
  </div>

  <button class="copy-button"
  @click="copyMissingList"
  v-if="missingList.length !=0">复制未接龙人员名单</button>

</template>

<script setup lang="ts">
  import{onMounted, ref,watch}from 'vue';

  const STORAGE_KEY = 'wechatGroupBuyFullList';

  const fullListText = ref('');
  const prevText = ref('');

  const fullList=ref<string[]>([]);
  const cleanedList = ref<string[]>([]);
  const uniqueList = ref<string[]>([]);
  const duplicateCount = ref(0);
  const missingList = ref<string[]>([]);
const similarList = ref<{ fullName: string; PrevName: string; similarity: number }[]>([]);

  const isComparing = ref(false);
  const showResult = ref(false);

  onMounted(()=>{
    loadFullList();
  })
  const cleanFullList=(text:string):string[]=>{
    return text.split("\n").map(line=>line.replace(/\s+/g,``)).filter(line=>line&& /^[\u4e00-\u9fa5]+$/.test(line));  
  }
  
  const smartCleanText=(text:string):string[]=>{
    const lines = text.split("\n").map(line=>line.trim()).filter(line=>line);
    const cleanedNames: string[] =[];
    lines.forEach(line => {
      if(line.includes('#接龙')||!/^\d+[.、)]/.test(line)){
        return;
      }

      let nameLine = line.replace(/^\d+[.、)]\s*/,``);

      nameLine = nameLine.replace(/1[3-9]\d{9}/g,``).replace(/\d{3}-\d{8}|\d{4}-\d{7}/g,``);

      const sffixRegex = /(的妈妈|妈妈|的爸爸|爸爸|的家长|家长|爷爷|的爷爷|奶奶|的奶奶)/g;
      nameLine = nameLine.replace(sffixRegex,``).trim();

      const nameSplitRegex=/[、,，]/
      let namesInLine = nameLine.split(nameSplitRegex).map(name=>name.trim()).filter(name=>name);

      const spaceSpliteNames = nameLine.split(' ');
      if((spaceSpliteNames.length<=3)&&(spaceSpliteNames[0]?.trim().length ==1||spaceSpliteNames[1]?.trim().length==1)){
        const firstPart = spaceSpliteNames[0];
        const secondPart = spaceSpliteNames[1];
        if (firstPart !== undefined && secondPart !== undefined) {
          const combinedName = firstPart.trim() + secondPart.trim();
          namesInLine.splice(0,namesInLine.length,combinedName);
        }
      } else {
        namesInLine = nameLine.split(/[\s]/).map(name=>name.trim()).filter(name=>name);
      }

      const validNames = namesInLine.filter(name=>name.length>=2&&/^[\u4e00-\u9fa5]+$/.test(name));
      cleanedNames.push(...validNames);
    })
    return cleanedNames;
  }

  watch(fullListText,(val)=>{
    fullList.value = cleanFullList(val);
  });

  watch(prevText,(val)=>{
    const cleaned = smartCleanText(val);
    cleanedList.value=cleaned;

    uniqueList.value=[...new Set(cleaned)];
    duplicateCount.value = cleaned.length -uniqueList.value.length;
  });

  const compareLists=()=>{
    if(fullList.value.length===0){
      alert('请先输入完整名单');
      return;
    }
    if(cleanedList.value.length === 0){
      alert('请先输入原始接龙文本');
      return;
    }
    isComparing.value = true;

    missingList.value = [];
    similarList.value = [];
    const usedPrevNames = new Set<string>();
    setTimeout(()=>{
      fullList.value.forEach(fullName=>{
        const exactMatch = uniqueList.value.find(接龙Name => 接龙Name === fullName);
        if(exactMatch){
          usedPrevNames.add(exactMatch);
          return;
        }
        let maxSimilarity = 0;
        let similarPrevName = '';

        uniqueList.value.forEach(PrevName => {
          if(usedPrevNames.has(PrevName)) return; 
          const similarity = calculateEditDistanceSimilarity(fullName, PrevName);
          if(similarity > maxSimilarity && similarity >=50){
            maxSimilarity = similarity;
            similarPrevName =PrevName;
          }
        });

        if(similarPrevName){
          similarList.value.push({
            fullName: fullName,
            PrevName: similarPrevName,
            similarity: maxSimilarity
          });
          usedPrevNames.add(similarPrevName);
        }else{

          missingList.value.push(fullName);
        }
    });
      missingList.value = fullList.value.filter(
        fullName => !uniqueList.value.some(
          Name=>Name.includes(fullName)||fullName.includes(Name)
        )
      );
      showResult.value = true;
      isComparing.value = false;
    },300);
    saveFullList();
  };

  const copyMissingList = ()=>{
    if (missingList.value.length ===0)return;
    const textToCopy = missingList.value.join('\n');
    navigator.clipboard.writeText(textToCopy)
    .then(()=>alert('未接龙人员名单已经复制到剪贴板'))
    .catch(()=>alert('复制失败，请手动复制'));
  }

const saveFullList = () => {
  if (!fullList.value.length) return;
  localStorage.setItem(STORAGE_KEY, fullListText.value);
};

const loadFullList = () => {
  const savedText = localStorage.getItem(STORAGE_KEY);
  if (savedText) {
    fullListText.value = savedText;
    fullList.value = cleanFullList(savedText);
  }
};


  const calculateEditDistanceSimilarity=(str1:string, str2:string):number=>{
    const len1 = str1.length;
    const len2 = str2.length;

    if(len1 ===0 || len2 ===0) return 0;


    const dp = Array.from({length: len1+1}, () => Array(len2+1).fill(0)) as number[][];
    

    for(let i=0; i<=len1; i++) dp[i]![0] = i;
    for(let j=0; j<=len2; j++) dp[0]![j] = j;


    for(let i=1; i<=len1; i++){
      for(let j=1; j<=len2; j++){

        const cost = str1[i-1] === str2[j-1] ? 0 : 1;

        dp[i]![j] = Math.min(
          dp[i-1]![j]! +1,  
          dp[i]![j-1]! +1,  
          dp[i-1]![j-1]! + cost 
        );
      }
    }

    const maxLen = Math.max(len1, len2);
    return Math.round((1 - dp[len1]![len2]!/maxLen)*100);
  }
</script>

<style>
  .container{
    max-width: 1200px;
    margin:0 auto;
    padding: 20px;
    text-align: center;
  }
  .title{
    color: #2c3e50;
    margin-bottom: 10px;
    font-weight:600;
  }
  .blog-link {
    color: #000000;
    text-decoration: none;
    font-size: 14px;
    padding: 6px 12px;
    border: 1px solid #000000;
    border-radius: 4px;
    transition: all 0.3s;
    display: inline-block;
    margin-bottom: 30px;
  }
  .blog-link:hover {
    background-color: #575757;
    color: white;
  }
  .input-container{
    display: flex;
    gap: 40px;
    margin-bottom: 24px;
  }
  .input-area{
    flex:1;
    min-width: 300px;
    display:flex;
    flex-direction:column;
    gap:8px;
  }
  .list-input{
    padding: 12px;
    border:1px solid #e1e4e8;
    border-radius:8px;
    resize:none;
    font-size:14px;
    line-height:1.6;
    color:#2d3748;
    transition:border-color 0.3s,box-shadow 0.3s;
  }
  .list-input:focus{
    outline:none;
    border-color:#3182ce;
    box-shadow: 0 0 0 3px rgba(49,130,206,0.1);
  }
  .count-info{
    margin:0;
    font-size:13px;
    color:#64748b;
    text-align:right;
  }
  .tip{
    margin: 0;
    font-size: 12px;
    color: #22c55e;
    text-align: right;
  }
  .compare-button{
    width: 100%;
    padding: 14px;
    background-color: #515151;
    color:white;
    border:none;
    border-radius:8px;
    font-size:16px;
    font-weight:500;
    cursor:pointer;
    transition:background-color 0.3s;
    margin-bottom: 24px;
  }

  .compare-button:hover:not(:disabled){
    background-color: #3a3a3a;
  }
  .compare-button:disabled{
    border:1px solid #393939;
    border-radius: 10px;
    padding:24px;
    color: #353535;
    background-color:#f8fafc;
    cursor:not-allowed;
  }
  .result-area{
    border:1px solid #e1e4e8;
    border-radius:10px;
    padding:24px;
    background-color: #f8fafc;
  }
  .result-title{
    color:#2c3e50;
    margin-top:0;
    border-bottom:1px solid #e1e4e8;
    padding-bottom: 12px;
    font-size: 18px;
    font-weight: 600;
  }
  .result-stats{
    display: grid;
    grid-template-columns: repeat(auto-fit,minmax(180px,1fr));
    gap:12px;
    margin:20px 0;
    padding:16px;
    background-color:white;
    border-radius:8px;
    box-shadow:0 1px 3px rgba(0,0,0,0.05);
  }
  .result-stats p{
    margin:0;
    color:#34495e;
    font-size:14px;
  }
  .count-badge{
    background-color: #202020;
    color:white;
    font-size:12px;
    padding:2px 8px;
    border-radius: 12px;
    font-weight:normal;
  }

.similar-area{
    margin:24px 0;
    padding:16px;
    background-color: rgba(220, 222, 223, 0.265);
    border-radius:8px;
    border-left:4px solid #bdbdbd;
  }
  .similar-title{
    color:#050505;
    font-size:16px;
    font-weight:600;
    margin-top:0;
    margin-bottom:12px;
    display:flex;
    align-items:center;
    gap:8px;
  }
  .similar-list{
    list-style:none;
    padding:0;
    margin:0;
    background-color:white;
    border-radius:8px;
    box-shadow:0 1px 3px rgba(0,0,0,0.05);
  }
  .similar-item{
    padding:10px 16px;
    border-bottom:1px solid #bdbdbd;
    font-size:14px;
    color:#646464;
    display:flex;
    flex-wrap:wrap;
    gap:8px;
    align-items:center;
  }
  .similar-item:nth-child(even){
    background-color:#f8fafc;
  }
  .full-name{
    color:#4c4c4c;
    font-weight:500;
  }
  .接龙-name{
    color:#292929;
    font-weight:500;
  }
  .similarity-tag{
    margin-left:auto;
    background-color:#3b3b3b;
    color:#ffffff;
    padding:2px 6px;
    border-radius:4px;
    font-size:12px;
  }

  .missing-area, .cleaned-list-area{
    margin:24px 0;
  }
  .missing-title, .cleaned-title{
    color:#2c3e50;
    font-size:16px;
    font-weight:1000;
    margin-bottom:12px;
    display:flex;
    align-items:center;
    gap:8px;
    flex-direction: column;
  }
  .no-missing{
    color:#22c55e;
    padding:16px;
    background-color: rgba(34,197,94,0.1);
    border-radius:8px;
    text-align:center;
    font-size:14px;
  }
  .missing-list,.cleaned-list{
    list-style:none;
    padding: 0;
    margin:0;
    max-height:240px;
    overflow-y:auto;
    background-color: white;
    border-radius:8px;
    box-shadow:0 1px 3px rgba(0,0,0,0.05)
  }
  .missing-item,.cleaned-item{
    padding:10px 16px;
    border-bottom: 1px solid #f1f5f9;
    font-size:14px;
    color:#2d3748;
  }
  .missing-item:nth-child(even),.cleaned-item:nth-child(even){
    background-color: #f8fafc;
  }
  .copy-button{
    padding:10px 20px;
    background-color: #3d3d3d;
    color:white;
    border:none;
    border-radius:8px;
    font-size:14px;
    font-weight:500;
    cursor:pointer;
    transition:background-color 0.3s;
  }
  .copy-button:hover:not(:disabled){
    background-color: #313131;
  }
  .copy-button:disabled{
    background-color: #d4d4d4;
    cursor:not-allowed;
  }

  @media(max-width:768px){
    .input-container{
      flex-direction:column;
    }

    .result-stats{
      grid-template-columns:1fr;
    }
  }
</style>