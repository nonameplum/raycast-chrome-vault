import {
  ActionPanel,
  List,
  Icon,
  Action
} from "@raycast/api";

import { useEffect, useState, useMemo } from "react";
import { ChromeDecryptor } from "./api";
import { tokeniseStringWithQuotesBySpaces } from "./utils";
import { Item } from "./types";
import Fuse from "fuse.js";

const decryptor = new ChromeDecryptor();

export default function Command() {
  const [items, setItems] = useState<Item[]>();
  const [searchItems, setSearchItems] = useState<Item[]>();
  const [searchText, setSearchText] = useState("");

  async function loadItems() {
    const items = await decryptor.listItems();
    setItems(items);
    setSearchItems(items);
    decryptor.chromePasswords();
  }

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {    
    const tokenisedSearchQuery = tokeniseStringWithQuotesBySpaces(searchText);
    if (tokenisedSearchQuery.length === 0) {
      setSearchItems(items);
      return;
    }

    const fuse = new Fuse(items!, {
      keys: [
        "url",
        "username",
      ],
      threshold: 0.2,
      ignoreLocation: true,
      findAllMatches: true
    });
    
    const result = fuse
      .search({
        $and: tokenisedSearchQuery.map((searchToken: string) => {
          const orFields: Fuse.Expression[] = [
            { name: searchToken },
            { "url": searchToken },
            { "username": searchToken }
          ];
    
          return {
            $or: orFields,
          };
        }),
      })
      .map((fuseResult) => fuseResult.item);

    setSearchItems(result);
  }, [searchText]);

  return (
    <List isLoading={typeof searchItems === "undefined"} searchBarPlaceholder="Filter by domain..." onSearchTextChange={setSearchText}>
      {searchItems ? 
        searchItems.map((item, index) => (
          <List.Item
            key={item.url+index}
            icon={item.faviconUrl}
            title={item.url}
            subtitle={item.username}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={item.password} />
              </ActionPanel>
            }
          />
        ))
      : null}
    </List>
  );
}