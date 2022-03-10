import { useMemo, useState, useEffect } from "react";
import { FilterFilled } from "@ant-design/icons";
import {
  Table,
  Typography,
  Dropdown,
  Input,
  Tooltip,
  Select,
  message,
} from "antd";
import axios from "axios";
import "./styles.css";

import Fights from "./Fights";

const { Option } = Select;
const { Title } = Typography;
const commaMaker = (value) =>
  value.toLocaleString("en-US", { maximumFractionDigits: 2 });

const columns = [
  {
    title: "Username",
    dataIndex: "username",
    key: "username",
    width: 400,
  },
  {
    title: "Bet amount",
    dataIndex: "betAmount",
    key: "betAmount",
    sorter: (a, b) => a.betAmount - b.betAmount,
    render: commaMaker,
    width: 400,
  },
  {
    title: "Gross winnings",
    dataIndex: "winnings",
    key: "winnings",
    sorter: (a, b) => a.winnings - b.winnings,
    render: commaMaker,
  },
  {
    title: "Profit",
    dataIndex: "profit",
    key: "profit",
    sorter: (a, b) => a.profit - b.profit,
    render: commaMaker,
  },
];

const defaultEvent = "divegrass";
export default function App() {
  const [event, setEvent] = useState(defaultEvent);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [usernameFilter, setUsernameFilter] = useState("");
  const [eventVisible, setEventVisible] = useState({});
  const [dataHolder, setDataHolder] = useState({});
  const [eventHolder, setEventHolder] = useState([]);

  useEffect(() => {
    getData(event);
  }, [event]);

  const getData = async (path) => {
    try {
      const { data } = await axios.get(
        `https://betting-iscringe.github.io/data/${path}.json`
      );
      const usedEvents = Object.keys(data);
      setDataHolder(data);
      setEventHolder(usedEvents);
      setEventVisible(usedEvents.reduce((a, v) => ({ ...a, [v]: true }), {}));
    } catch (err) {
      message.error(event + " retrieval failed", 1);
    }
  };

  const items = useMemo(() => {
    const usedData = dataHolder;
    const usedEvents = eventHolder;
    // Remove non alphanum
    const userFilter = usernameFilter.replace(/[^0-9a-z]/gi, "").toLowerCase();
    const userDirtyFilter = usernameFilter.toLowerCase();
    const users = {};
    usedEvents.forEach((eventName) => {
      if (!eventVisible[eventName]) return;
      const bettingPools = usedData[eventName];
      const pools = Object.values(bettingPools);

      // Loop through all the pools and record each user's winnings
      pools.forEach((value) => {
        // Calculate total bet amount for winning choice
        const { userBets, winOption, totalPool, archive = false } = value;
        if (winOption === null) return;

        // special shit for archive data
        if (archive) {
          userBets.forEach(({ userid, username, winAmount }) => {
            const user = users?.[userid] || {
              userid,
              username,
              betAmount: 0,
              winnings: 0,
              profit: 0,
            };
            user.username = username;

            // Use ratio of bet amount to total winning bet amount
            // apply ratio to pool
            user.profit += winAmount;
            users[userid] = user;
          });
          return;
        }

        const winning = userBets[winOption].reduce(
          (acc, { betAmount }) => acc + betAmount,
          0
        );

        // Loop all bets and record total bet amount and winnings
        const options = Object.values(userBets);
        options.forEach((option) => {
          option.forEach(({ userid, username, betAmount: amount, option }) => {
            const user = users?.[userid] || {
              userid,
              username,
              betAmount: 0,
              winnings: 0,
              profit: 0,
            };
            user.username = username;
            user.betAmount += amount;

            // Use ratio of bet amount to total winning bet amount
            // apply ratio to pool
            if (option === winOption) {
              user.winnings += (amount / winning) * totalPool;
            }
            users[userid] = user;
          });
        });
      });
    });

    return Object.values(users)
      .filter((user) => {
        if (usernameFilter) {
          const userCheck = user.username
            .replace(/[^0-9a-z]/gi, "")
            .toLowerCase();
          const userDirtyCheck = user.username.toLowerCase();
          return (
            (userFilter && userCheck.includes(userFilter)) ||
            userDirtyCheck.includes(userDirtyFilter)
          );
        }
        return true;
      })
      .map((user) => ({
        ...user,
        profit: user.profit + (user.winnings - user.betAmount),
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [usernameFilter, eventVisible, event, dataHolder, eventHolder]);

  const options = ["HFZ", "divegrass", "etc"];

  return (
    <div className="App" style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          width: "100%",
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <Title level={3} style={{ minWidth: 300 }}>
          Nasfaq {event} bet leaderboard
        </Title>
        <div
          style={{
            width: "25vw",
            minWidth: 300,
            padding: 4,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Select
            defaultValue={defaultEvent}
            style={{
              width: "8vw",
              minWidth: 150,
              marginTop: "0.5em",
              marginRight: "1.1vw",
            }}
            onChange={setEvent}
          >
            {options.map((option, i) => (
              <Option key={i} value={option}>
                {option}
              </Option>
            ))}
          </Select>
          <Input
            placeholder="Filter usernames"
            allowClear
            onChange={(e) => setUsernameFilter(e.target.value)}
            style={{ width: "20vw", minWidth: 200 }}
          />
          <Tooltip title="Filter streams">
            <Dropdown
              overlay={
                <Fights
                  eventVisible={eventVisible}
                  setEventVisible={setEventVisible}
                  events={eventHolder || []}
                />
              }
              trigger={["click"]}
              visible={dropdownVisible}
              onVisibleChange={setDropdownVisible}
            >
              <FilterFilled
                style={{
                  fontSize: 19,
                  paddingTop: "0.5em",
                  marginLeft: "1.1vw",
                }}
                onClick={(e) => e.preventDefault()}
              />
            </Dropdown>
          </Tooltip>
        </div>
      </div>
      <Table columns={columns} dataSource={items} />
    </div>
  );
}
