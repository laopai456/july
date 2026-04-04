const config = {
  pageSize: 20,
  defaultRegion: 'all',
  defaultType: 'all',
  defaultGenre: 'all',
  regions: [
    { code: 'all', name: '全部' },
    { code: 'kr', name: '韩国' },
    { code: 'jp', name: '日本' },
    { code: 'cn', name: '中国' },
    { code: 'us', name: '欧美' }
  ],
  types: [
    { code: 'all', name: '全部' },
    { code: 'movie', name: '电影' },
    { code: 'drama', name: '剧集' },
    { code: 'variety', name: '综艺' }
  ],
  genres: [
    { code: 'all', name: '全部' },
    { code: '爱情', name: '爱情' },
    { code: '悬疑', name: '悬疑' },
    { code: '喜剧', name: '喜剧' },
    { code: '动作', name: '动作' },
    { code: '治愈', name: '治愈' },
    { code: '奇幻', name: '奇幻' },
    { code: '科幻', name: '科幻' },
    { code: '剧情', name: '剧情' }
  ],
  sortOptions: [
    { code: 'rating', name: '评分' },
    { code: 'year', name: '年份' },
    { code: 'hot', name: '热度' }
  ]
}

module.exports = config
