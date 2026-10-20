'use client';

import { useState } from 'react';
import { Button, Dropzone, Tabs } from '@acme/ui';
import { useTemplateSearch } from './useTemplateSearch';
import { useUploadTool } from './useUploadTool';

export function TemplateSearchScreen() {
  const [keyword, setKeyword] = useState('');
  const [category, setCategory] = useState<'all' | 'poster' | 'banner'>('all');
  const [page, setPage] = useState(1);
  const search = useTemplateSearch({ keyword, category, page });

  return (
    <main>
      <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="템플릿 검색" />
      <Tabs value={category} onChange={setCategory} items={['all', 'poster', 'banner']} />
      {search.isLoading ? (
        <p>불러오는 중</p>
      ) : (
        <ul>
          {search.templates.map((template) => (
            <li key={template.id}>{template.title}</li>
          ))}
        </ul>
      )}
      <Button disabled={page === 1} onClick={() => setPage(page - 1)}>
        이전
      </Button>
      <Button disabled={!search.hasNext} onClick={() => setPage(page + 1)}>
        다음
      </Button>
      <UploadBox />
    </main>
  );
}

function UploadBox() {
  const upload = useUploadTool();
  const [file, setFile] = useState<File | null>(null);
  const [isGuideOpen, setGuideOpen] = useState(false);

  const extension = file?.name.split('.').pop()?.toLowerCase() ?? '';
  const isAllowed = file !== null && file.size <= 20 * 1024 * 1024 && ['png', 'jpg', 'jpeg'].includes(extension);

  return (
    <section>
      <Dropzone onDrop={(files) => setFile(files[0] ?? null)} />
      <button type="button" onClick={() => setGuideOpen(!isGuideOpen)}>
        업로드 안내 {isGuideOpen ? '접기' : '보기'}
      </button>
      {isGuideOpen && <p>PNG · JPG, 20MB 이하</p>}
      <Button disabled={!isAllowed || upload.isPending} onClick={() => file && upload.start(file)}>
        올리기
      </Button>
    </section>
  );
}
