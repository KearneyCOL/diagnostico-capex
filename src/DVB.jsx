import { useState, useMemo, useEffect, useRef } from "react";
import React from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { getIdFromUrl, setIdInUrl, loadAssessment, saveAssessment } from "./dvbStorage";
import { supabase } from "./supabaseClient";

// ─── REAL CLARO LOGO (PNG extracted from Master_Claro.pptx) ──────────────────
const LOGO_PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAB4CAYAAACDziveAAA+S0lEQVR42u19eZxcV3HuV3VuT8++arFsWaPpHmEjwCEZL2D8aDmAQ1icsMjwMIT4kRDHj5BACGFLLJOEQHghZIOYBB7LY4kGA4aEnUgNTsDgARyIYlvTPRpLWJZGs/YsPd3nVL0/7r2jlixL08vM9Ej3+/36Bz95+va959zznao6VV8RIkSIUJdQgAhQ3bKleaK5eThGdFFR1SH8d1UQoABIiejkF9V2GtMwrfq67uHhD2gq5VE6baMRfSy8aAgiRFgfYJ/4vJDpSjmPSv5Ogr8VVY5GLSLACBHOJ6tQT+O7x/mzCMvcVCJEiBAt7miMIkSIECEiwAgRIkSICDBChAh1AYqGAAqwAiYiwAgRLiA8KnLB858CTIAQ4LSG+0FEgBEiRKh38vMIkGOJxHXT/f3vIkAVMLUgwogAI0SIULfY55OffTiReEoL813txrx1LJF4FwEOqVTV7nBEgBEinKeQdR46VMBcD9gj27df1sX8NQY2TRSLhQ2e99YTicQfUzptNZWqKpc5IsAIESLUJfkR4EZ37Eh0et7XY8CWeVVHRA1TztluY+4YSyT+sFoSjAgwQoQIdUl+R5LJS7tFvh4j2jYr4jg4ARbATIvYbmPefSKR+L1qSDAiwAgR6h2bN18w1k1IfiO9vRd1AF+PMydzzjkmWor3EUACmJyI7TTmr8YSiVspnbb3DQzEIgKMECHCusTe0PK7+OKeDZ731Ubmy2ecs6XkV0qCDjCzIq7DmA+eSCRefeXQULFcEowIMEKECPVg+fFNgMskEh3tTU1faWb+uWmf/B7XtSWALMALIq6F+aPHk8mbrhwaKpbjDkdqMBEiRFhz8iNAjm7e3NJM9C+tzFdNnIP8Siw4KgIMVWkl+tTxRCJH6fRXwmtGFmCECBHqmvwA6EP9/fHm1ta725mvWy75lZKgBVBUpRbmz53o77+BANFl8FtEgBEiRFgr8iMA2J9KmU2qd7Ub86zxMsmv9FoKKAENqtp80kuOXOAIESLUJ/kRATp15MhnOox5/oS1RSYq+yRXAPUAbSDinHO7N4+MfCFwgV1kAUaIcIFCVOuyEiQgPyZAJpPJj3cY85IJa4tUAfmpT37SRMRzqq/ePDJyl6ZS3nLifxEBRohwHoOJ6k4aXwHC7t1MgJtIJP6x05hXTlZBfgZwrcxmRuTWjZnMJ+4bGIiV0wAqIsAIESKspuVnaHDQjScSf9Pleb8xaW0RFZIfA66N2Zty7g0bs9k77xsYiF05NFQsa5OIpiVChAirAEIqZQiwE8nke7o973cmrLUVkh8IcJ3GeNMib9+Qzb6/EvIDokOQCBEirIb1l0oZSqfteF/fni5j3jzpnKUKTnsD2C5jvAlr/6wnm31X0Pe4WMmFIgswQoQIK01+HqXTdiyR+MNuz7t90jmrlRpfqsVuY7xJ5/6qJ5t9h6ZSHtJpV+m9RQQYIUKEFUN4KHEikXh9tzHvnhKxgeBBBdynxS7Pi006d2d3JvPGfYCHdNpRFX2QIxc4QoQIK0Z+Vw4NFceTyd9sZ/7rGREnPvmVzX+qWuz2vNi0tR/vzmZvDZojVUV+kQUYIcJ5DFnD3w7J79j27a9qZf7QnE9+XCX5DXZms68OStykWvKLCDBChAgrR359fS9t87yPLYiIrZD8RNV2e15s2rkvfT2b/Z9h7XAtyC9ygSNEiFBThCeyx/v6XtBizGeKqmoB4grJr8cYb8a5b3TE4y/d7Ru1VCvyiyzACBHOY3ANiaIM8rOP9vU9u5X5s1aVrX8flVl+xngzIt+ZnZ//VT5woBCQn9R4jCJEiBChSvIDPEqn7bFE4ro2Y+62RPGi76qWzTGiaruM8WZFvn+M6AWXHD06L8vU94tc4AgRIqw++QH2kb6+q9qY/0WA5oKqcIXk12GMNydy/8zCwvOe8MgjM7pC5BdZgBEiRKgKYePyR/v6ruhg/ooCHfnKyc+1G+PlRR4Yt/a5Wx95ZDzIGVyxA+01twBDXTAAtD+Vol2P83f7AexKp9X/Su1OgVbgeRipVGUbSzottLbZCxHqEceOAa2t9fiuGwLsz3p7L28z5msE9MyrLrWvLJf82owxiyLZaeCGvtHRR8MOcSv5DN4qD5hPdqkU70+nsetkIqMGBFDetVIpE1ynboiDAEE6HZFYhPPd7fUbl2/bluiIxb5mgItmRdyZOrgth/xamU1B5Mg80Q1bh4cPrwb5rRoBhlZRoNOlpQQxtW1bl21o2BIXucgBmwF0OKJmBuD83QQM5AHMGOC4Mh9tKxYfodHRKZTofi1ZXlWWxlTzjATIWCLxrC7mp8yoOqguzxIkknYiMyPyre5s9icrGfOIEKFW5He4v39rp+rXY0TbTu/du2zyA1wzs3HAsZy1N1w8OppZLfJbUQIMVV8RWmfptCjAs319T1bPe7qIXEPAUwTYblQ3xIxBc+gLU3BqrhpeCwqgCGBBBJPGnJhKJjME/JBVv22A/6Bs9uGQWIMyGV1VEvHJVxi4xXjezW3WwuPl8Z9VhfE8oFD4XQA/Ca8VLbUIpUtKT1Y/0Dm9EP9Tc0Ngb0nj8k7Vr8eZkzMV9vEQX8nZKDAxWSw+d+vo6H+HMcXVGlRvhcgvZHAHAHN9fVc55t054JcFeHI7ADCjAKCgCquKORF/wlT1cayksIcAe8wb4kQbYsA1Avz2nMjcTDL5PUN0F4y5mx588JElq/DkC7E6LjBRTqy1MyK2jPG1ndZ6SrQQrfMIj4N4nCh8n8/+MgENIIKoejVe1xw2Lm/3vK82MT9xqgryixOxquZyzj1v6+joj3WVya/mBFhSpuJ0YCA2Oz29G6q3CtH/aCPCgiryqph0zgZswQGpYSlfiM6ZM6lFnzRFVRVEZICWJuZnecCzZq1911wy+bmiyJ00MvL9EotQVsk15lDnbLl6Z8FjeBCJTuUjPJYsmFVVRxdFFoq+gUDnciuhagBM1zrEk0kkOtqJvtLC/HOTVZBfg79u52eZX7Alk7k3TKJe7bH1ajQ4YZMTBwC5/v5Xzk1NvbmZ+SmWCLMimBCxIGIqIYiKjSz/f03oKjtAcyKiqogRdTYx/y8humU2mfyCY34PHTx472mWaYQIdY9ww77k6NH5kd7eZxjnllVRcakxerhQoEwyWUQ2i2qJpZrG5We4lsQA8lSLOedetPnQoW+vFfnVhABLAvZuPJm8thH480aiZxYATIq4wLozqI70zvWiUEiIFtAJ54SIuIP5RfOqv5pLJj8yRbSHhoeP1LqYOkKE1UDf6Gi+7C8dOVIzr26kt7ex2fO+2M583Xjllp/GAMSIZMba3RcdOvT1tSQ/oMpE6CBgKV/u74/nksl3x4m+E2N+5qSIm/eTIQ1VkBNULRkykSGApkVcURWtzK/pVv3hTDL5GxS4wrrK9xUhQrVeVrmfGnl2OjQw4HUb8/l25l+skvykgYhnrX3FRYcOfbHcDm51RYCaSnnXA/ZEf//O/6H6nVZj/nBRlXIiLiC+NY9nUSC+OOGcdUQbW5n/MZdM3pXp69tMgNOoFDDCOnKHy/1US37hNfqnpwfbPe+5E84VK3R7/d69zGZO9dWbDh3aW2kTo7ogwH1B4fOJROLFTcB/xJmvGrfWkj9odWdZEZFXVNVJEdvC/OLNxtx7vK/vfxBgNZWKSDBChMdafjSRSHRMJ5N3tTP/yoS1ttrevdPO3bohk/l4vZBf2QQYmNbmesBO9vW9oY35Lgd0zPgZ4HVNJAE5exPOWQZ6W5i/dSKRuIXSaRtZghEinL5coGRtNwPPmheBEpWv5Hxq797f25jN3qmplFcv5FcWAS41NQbcZDL5zk7Pe9+8qisGsb71MrNM5M2rSgHwOo35yEQy+VYCrAJeLeImESKcB+wnAKjr4YdHrOp1pDrRRGSkjHza0t69k9a+bUM2+9drfeBRnQUYNDUeTyT+rNOYP5oUsYFG17rLXWOAHYAZEddlzLsmk8k/CRIwo4ORCBECElTAdGezP5lx7nlQzcWJeLkkSIGm34Rzf7phZOTP65H8lk2A4c2fSCTe0e15bwv6elbU3amOHpwU4EnnbKcx7ziRSNwexQQjRDiFBJ0C3pZDh+6dc+6FBlhoIKJzkaCq2i7P8yat/cueTOaPAv5wdcoDyyO/435fzz+ZWj3y01WYYFLATDpnezxvz7Fk8nWUTkckGCHCyTViNZXyNh06lM6pvtgDbIO/OOVx2K/Y7XnepHMf7M5m3xT27kWd5t2edaGXnva2G/PXM77bW2vyEw1qgImIgsRqCsgpZEIFIGHNGCrsMHU2Epx2znYQ/e3xRCJL6fSX16JqZC3875K4ZyhVdsZx3Y/1oce4SmOFNVIcKp0rAMAe/6MreU+hUUDp9FfHksmbWojuElVY/5CDSiy/Yrfnxaac+1h3JnNbrXr3rgkBBkRkH+3ru6KJ+RN5EXE1Ih4FVFWFiChOxI1EMMAp4ggSDK6BXzsXJzIeEawqFlRRVHXBpJtakKADuABoM/Mnj/X3X0nDw5nzUZZKAd6fSvEu4HQB1ko0GQ1SKYJPjHK+keKSopH/jKu6kM80TyW/f8p93LEKc0LptL1vYCC2cWjoC8cTiZvbmT+dV3UWYAZoifys3duVzf763tWtv68tAYY7zdhll7XFrN1riJrzqq5asgmJL0ZkWo0xRVXkRQ7PEd0L4LtW9QEBjhPzvBaLAs8zYI4VVBuLIhcR0RUkcq0SXd3B3KUAZkQQ7DKmShLkgqrrYO4sinxKU6lnIJ1WrXEbvrVayPtTKbPLX8SnCLZqKuXljh7tdKpb2blLwNwlqo0CkIo4MFsA8JiLsHbMET0a87xH2x966AQBrpQwS6pr1i0ZluhKhpvD0jNqf38chULz8dbW4uYDB2ZXhHBTKYMzzBMAHNu5s7Vlbq7VNjQ0U7EYW2SWFmPmHdFiLpebv+To0fnT52QvYHbXaE6uHBoq3jcwENs0NPSZE4lEY7sx/3dORJzfvjKWE/niN7LZV9SycfmaEOD+VMpcn07bsWLx7zo877Jxa221eX6i6jwi02GMmVWdnhP5PBF9arGx8btlvExfAABNJDbNqj5HgVfFgF9qZjbTIhrkHVV8Ks2BK9zjeVefOHz4jo3A2/f5Y2TXK/EhFKkITuAWenu3W2OerkRPE9WnTB4+vA1EPQbobDYGvjxPYOQzn/IGFz0PeRFY56amkskjAB5kYIiA77YS/ZCGh2dKiXVPOi131MiCDkn8lH/01cBPWWSDAHaf+m/LctdLFIOWiEcvu+zinHPXqkhKiZ46rXpJY0NDRyyf/wGA59ZqcwwIg0rnaXLbtj7P865RomsEeLKqXqyLi90FY1rVuUYYYwygiyKLAArNzc2zU8nkGAFZIrqfVe8VY4baH3roxFJIK5XydlVpyV45NFQM3OGPHk8mY21EH2o0hmec+8bheHz3SvTuXeEY52NfBALciUTixV3G3DXtnK1GyCCM33UwmwWRHIAPGNUPNGezDz+O2f6YgRsEaDeA4G9Okb+f6+u7Wo15EwO7mQizFSrTnrZgJEZEVvXqzkxmaC9gbjpHPDA8LJpIJu/sZH7tpHO2DDks2+U3gL61M0gWrYGCx1IM88jFF/d0NTa+1DG/TFWf1srcxPAFZouqcPBFWRVwpKcKMtLSoJToMRIhKGqHIUJeBAXVRwjYb4B/Hl9c/Ma2I0cWTiOWuu3hwn4cGgAwm0z+AoBfdMAvAbi6hbk9DM8sqqKFGVPO/bgnk/n5agnwdBWluR07LhHnXgKilwhwVQtzkwl2X+vH3CB+eOiU+WEicGDNeMGcFHzv6gQD3wHz4KLqv24INqhazElYzXGir+8NTcy/Or64+NxtR44srLewEZ1hQmiqt7edPO+/PKIti6paaa6fAOIB3MqMBZG7FlTfuimbPVitu1SiNr2k+jyZSPyix/yeVqIrJ3xxVao0Xql+9rqZdu77G7LZpwcDJeuBAEsX1cNbt3b3xOOvF+C1LcxbLIB5EThfLy48UKJyx0pPinRrcB1uIOJmIjgAeZGMAT5ZsPb/do2OHjqdkMt9HgJ0sre3U415HpgJvrUvzGytqmXVgqoWGFgUYJFVFw2QF9XFhsbGQrNz4zQ8vHi2TSKXTL6MiF6nwHWtREvq4/bUsdJmIjMv8qOebHagGgIs/e3xROLJDcy/A9WbWpg7w98+0zyVLtzTNqpw41qak1gwJ/Cv9zCAjy0y37nh4MGfVTMnp50TyOlztZ68pFMX6O7dTIODbszz9mww5uJqXF9Rdc3MRoH5nMjvdmUy/xQSRRDjcFWwtiL4/pL7kM3+230DA9fumJp6ZwvRWxb9HVMqIW8CzIxzboMxV08mEq/qzmY/tg/wrq9zVziM3RLgxhOJl8eZ393M3JsTwYRzLnBtOZAnq2bXPLkYg+sUVLUgIkpETUTJZuY/VuD3Zvv7/2kGeDcND49VuODCtd7XZcwnBQCMOXkaQBSkCJy0jlxwQglgMeacjIu8CsDnwjnUk6TvxpPJa+NE72kius4CpdqVdPpYaejeBTWxlSz20t8eu/TSixsbGt4B4H+1EMVzoVjwGX57Ge7byb8M/l9RVadVBQDiRNtamP+InLstl0z+3VGi99Hw8Ew11mCQLE0B+a7LWDmfEocYHJSx3t7LG4Hfnq7ClQxb3Anw8Lxzu7oymX9SwCjAlE7bWg5UcDrmFDADQ0O2I5N565zqyzyihYYyMtcfc10imldVJbrjZ1u2NO/yf4PqmPyYAN0PmFwy+cFOYz4NoHfcWltU1UAibMXyN8kfMsMA51VlwlprgfYW5jd2qv7wRH//S8N5quj5jLHTInZaxE6JuOngMyPiciJuTkQWVGVR/fSAINE9HiNqLi3iD8eJAJnq7789TvSdBqLrJv3rSNCTxjvrWJ0qNV+O5WzC355JJn+jOR7/USvzbxeB+KRz1vqRBq9W8xSKkxBgFlV1wlrriHpajbn9YmBoMpF4EQVpKlqhl7eeye8UAlwKXBqzp4W5wS1DevvxyK/dP+F9KFcspjaOjPzgvoGBWDDQKxYbCC2L+wYGYj2ZzN45a5/LqjPxCkmQAF4QkW7m3qbm5lsIUJwehK8T3B6EA45u3twykEz+a6sxt06L2EVVYX9BrSpxh6rfDtBxa60Qbe0kGhxPJvcQ4PZVIj4hwhSGuYJFfdqHqSRNS4PWDBZQJnIAsGvnTiZAHurvb8/199/dwbynVMJtOQdoge8fC9I8lr3qg34X7qH+/o25ZPKzrcz/6IBNE357iJD4aAXnhIjIswEREtDfYszncv39H/rx5s0tYelbFR4Z1i0Bhs1OZvr7dzYSvWRaRKgy0UPXaowpiGSnRZ6zZXT00GqqPxCgVw4NFXVgILbp0KFvTzv3QgbyDf69lW/iE9GCqqrqG7W/P450uu6sQAXoSUH6RFNr6xfajLlh3NpiQBRrWqcdiNN6i6oyI2K7jbl9LJl8Z+CGmpX/+SC26ZwCIDpwoPBIf//GLarfbGW+ccIfp7JySf2MY/J27ty5/O+kUh4Bdqyv76pLVL/bwvySSeds0U/+97CK71RIhHlVyYm4Vubf3NHaes/PensvvxA1MjmI/REAFETe0MLsSRA3KJP8pJHIONVHJ4BfuiSbfTisJFn1hReQ4MWHDn171rlXxpnZ+Bailvmy8LyIdBqTmAZurFMrkG8C3InDhz/cYcyzJ6wtcgW6bSttESpgppwr9jD/0YlE4sVlu8Oxyh9JmA0APXL55T2tql9vZr5qwtoiEcXKsbrCYCSpeu0zM2bZ5JdO27Fk8leajdnPRMmJ4IBsLWvpA2vZjFtrY8xP7fK8e8aSyesvtHp4VoBocNDlEolNBrgpJ6IoM/anvty1kmohp/ribZnMsK7xoUFIgptHRu6aEfmTTmYvCA+VawVCAHWqtwLASvbrdWUuiPBQYay//7YNnvdrk8GirscXjQASwMypqiH64NTOnd17gvjRcr5frJAsCACrWgBoLRS+2Mr81OCEvhJxTwotwHh7u1k2+fX13dxC9HkHNM+r1pV2JhN5M845IeppBr76aDJ544VUD8+hRVMkuqnTmHbrV3yUuxCljdnMAm+8KJP5bhDzW/sT06Ehv5A7k/njKZF72ozxtMxTSAJMTgQe8Mzpvr4nBLGSNZcAC7PtJ7Zv742r/kXOOaf1L0rLiyKu05hNLp9/0x2A7F+mRd1QhR8swMJ4IvG+Ds+7drJCWfdTxl7Vi+Xz5pwxv3TaHk8mX9ZmzP8rqGpRVepRMZ2JTF5VLBBrJ7rreCLxvAuFBDm0aET1FQVAUabyqwKuk9lMOPe1zZnM39eT4isBOuiXs8Fa+5sF1bzxd3Et84V37cZ4jvklAIBUau01EHfv9tMPjNnTxtxS9PM1a1On7X+k5FO7U3sikxNRAK+d7O3tvN5X5F6pk2kz7WfmvM0QvWHK7xYYq3J8ACJma/kclrl9NJF4VivR/1tUFYeS3tf1GQvjIqAWMK3Mn320t/dpgVr6ea2RyUE6QNIjumpehKg8lWg1AC2ILDg/iZRW0kWsBDcBTlMpb+Po6AMLIn/ZzszqJ87a5X4IcIu+Es7zAzd4TbXNFGAaHHSP7tiR8ID/GRxamSquJ6pqJZjPBiJqJOImIo77CbXhyapTVVsNIRJABRHpMqZHPe/GYEM5570XVamS3EUFKE50nVSR6nHGddPczI87N4CbSib7W4kGHWCKdU5+pSRY8CuBmpo97/Mn+vu3BrFaPm8JEACcyHM6jPHEj5Us/y3zxQN4UfWDmzOZ4f2+anT9lcH4p7dMzH8x5dx4j+fFO43xupf56fS8eJzZ62R+xvT27ZdRbRdT+Qgs0JjIr7cbE3f+oVUlPRuggGsi4m7P85p9sct8UfV4XnV0QWS4IHLYqk4TgA5m02WMFyMiqSCeWuJyqfjCGC8K5uechBo7+YBlk2++wvE5G4nPncECDJOcR3p7GwEMNjB3LfotI3gdEQIviLhm5otY9TOBBUjna7sIL5jQXxQtz/tVQD0iMy0yq8XiX9aj9VfqCitAG4aHZyaTyd+A6rNnRJyomtPCRX5g7cwLTVqIjCOK1wmhm3HV3XkRgIgrID8NSW1W5IB17lMQ+TaIRoV5qqehIY8DB9yh3t5YPBZraxPZPOvck0H0HAJe2G3MxknflS3bLlPA5FUJwDW6ZUszHT06v9xk2kqSUyuxvpY0KHFqnpsE12o9c1iCaXDQnTDmbzqMeWotREROv5/Ta7XDF1drqJPJRGbKFwV5xolE4o6N2ew7Qm2/844Atb8/PiEysOgXw/Py09rVtRnjjVs7uPHw4Ud0925Dg4N1O0BLZTuZzBcQqMpUe701c38Bmdyx4ykNqpfNV1CrHfRpVUOEOdW3HSP6qyecoVYWADA66gDkAYwB+CmAz+QSiU1zIm9sJPrDoh/fojLTSaigqh7RRZOtrTsA3I/Hlrc+xgU2RCs9tgpVF9Y2NxAZU0K4NtggZ1Rjs2eK+w0OuhN9fc9pN+a2qQobiD9mlQXldw1+OMKY0G2jk9W/EjBTvoY6mUxkpp2zzcxvnerru5tGRn6wFiLBK06AEyI7CLh0UbW8nZKI86qIE31EAcLgYN0/LAG6FzC7H0f1eLnW15pmvgdadXBuV5vn0YS15ar1KAPi+fP38p5MZq8CFNRonxQ5OOPwgfYD1JbNHgfwlvFkMtvKfOdsID5Rbtyxxbc+LwNw//7wuc7iAq8k8amqNDCbVmZv0RfdPV4QyQI4RkBeiRqg2tlAtBmqjRKLyWmurz68dWsTEX3A+flWzNXdkyPAdDAbB2Be5FEn8oAj+hlUJwnIK2CUqJmBDgBbCdjZztwN1EQnkxxATUScZ/6AAk8rMcDPG+FbD0RPaiKKzftH9Lzcl7eJiOdFsj1dXfdSibtQ77jpNMHIdYcgXqbAM8oNWwCAqEq3MWZc5E83ZjJ7defOBhw4UFxGwrqWWqEYGDA0NPShE4nEizqMee6MSHmLzc8HhKgmAGDXGg2nAs4Apt0YkxMZy6kOiurnyLmh7tHRqTN9ZyKR6LjkgQdyS+GVwPuZiMd/r8uY/mpc39DVbWc28yKyIPI5Uv2oAvd0ZbPTZ/vuTH//xjnVXaz66jjR8xuITDgvlez4BJicc67HmCunEolXdWWzHy1XFGS1Yod7yvidPafFAJ/k+ea0lvHySiMz54F9dFIg0SLCihuxYQXFJNFTyg1bKCBNzGZK5NCstX+mgMGBA0Uqv0JGdGiIFaApojsJeG7FBES0Za0GU1VtmzFeQWRuTuR9LPL3bSMjx05bvHzK7QLSXUJEgfcjRxOJTQy8OVfFiXzQBgIdzGZO5Oue6ttbstn7Ttl4ztS3JZS/Hx4eg68JOziTSFxXIPrTbubUpIiK/yBU/gvni4II0e0Pb936z5ceOZIvR/xgFb2lZf9OaQsBj4Adld4hAfdEnLSq1goRoOM7dlzEItuKGvbCWf7G1WwM5639YN/oaD7YuCqdfiFAJ425f8baoiGKOZ8gyggjK6DaCfhNl84GG/SHqeFY2m5jvDnVexaBW3symf8C/EZgu8IDhxLZtdLXXksXdiplKJ22k0S3dRjTOWGtrbCOXhqImFXdrOofdGQyfxXGFkvGWwLCO5u1xYMA2rPZewDsmkom39ZI9Ge2Qnm4QBTE9RiznRsbX0HAh4NwiT3L2DIBcnzbti3G8z5jAE+IFP7B10qaB1ouWXpQ3ebKXUhEZs6PGf4UAAYrX0QRyt5zgJjqpYaoYVG1GHS1e9wducQFUSbCtLWLhvmuYCFJdRwCGCBXJJpjok6n5b8GSyki5whLxFBTX8p2G+PlnPvIUCbzW9eH9a9+fPecoQAq3ZDSaXts585WyedfO+cnXXMl5Bf3yS83C+zePDz8tYD4tJxDh9N0Mv3vZzLvGksm/6uZ6NMENBVUtVxLkImwqKpO5PV7gY8uNw/WAY1NzM9sIoLFyvrClV7bU2CzK+MawQkiFVTnpVh8BAB2n2ed0+oWfksAFIEntRtjYiLGWyZTCYAYMyaKxeHu4eFsQJpVz5shaigCcdGV2QMHg/eyVqfAqmq7jfH71vqtG0kBU1EIx29gZL18/oWdxmyZ8kVnTZnkpw3+RjA/JfL8S0ZGvqMDAzGqspoqJM7gWnef6Ou7sYn5X2OAF5BROYNp5lSlhfmKZ2/f/gw6dOjbyzkRjjNLQXXBqjZIZRlMKw4PQKcr/6WHU52RtraZiJVWEZs2aWA1HReRvXPOqfqKJmd3m1VJAXSqNgDYHyRQVJvXZRRwJ6y9rI25ac4XE63rhF9RdV3GeFPO3d2dzd5WooZc2TiEzZOIXqV+GWnZfMyANDCbKedeWSvyO4UIA1EQGhr65lgicUunMZ+cFbFly175cX9aMOZmAN/eH2zGZ0MeQKMqB5uCUj0SIBE1q+/OUhmTRqo6u+nAgYWIlVbR/w3yLLuHh78E4Eu1sBDKjUGG5BfGyCaAt/NpcZWVQLVpMMEBEM+KjCrwaj3ZU6bSnh5EgMz29l5UUH3mnC8mXdYGIKrS43lmvFh8z0UjI5+vNfmdgQQ/NZZIPH2DMa8bL1fxnYjnVQmqv6y9vY2UTp/zMKRxHawpBtAgFXyJgFy4iM63htj1jtBtq/DDy7y+/xuplKeplFciJa8EWAJkOpH423bmZ8341l+9F81rjIgWRV7Xnc1O76+2e1lQv2yN2dVuTEu5KkpBHiRPWXugp7v7jxQwGBpauUyKoSGrgCksLPzhtMhIEzNrGc9PQauDRuZLJ4wZKKGCdQ0PZb64FFTdqN9VEedD4/B1Zwme+XSyIiJF+AlTK05tO3pq4/OdOxvmZmd7JBa7RoHfb2G+biaQk6/YLV2uHqBqxafACrh2v3f0v20aGfmXUK2lJm418KxKLWDj116/iYaGimG/kJV8Z/YBdP3Ro/PjicTb2pg/nReRstx2VWkyhvOqzwTw71iGG1zvNcSeVtg5rewM3Ah1YTnC14AkpNPhCaMGxFf6d978ZZdtstb2QvUyItrpVJ8yvbj4BPG8ja3MbQpgSkR4lSy/ak6B9WTqyntrtiCD9ggTRFcX/LZA5agohW1X/2NjNvsVLekNvJIIWhEwstnPjicSe1qYLyunAAJE5Pzc02uDMVj3ho8H1SIRxctIoCHxY4aNkfu7jkgPS3G/JatOAbOwffvWAtEOMF+uqpeD6AlTwHa19uI4UUsjM5gIVhWFoDl3zi99U14HWnFh1dKMcyM9jY3/FoyDVDumBOix3t6LYqrJxSUja9mWFIxP6n8fuNO8akIiqRRTOm0ngI82Ev35vG8FLpe8adE/7X9SGK9c7x6gB6J5BuK2jFMa8V+Cdt25s4EOHChEbnBdLny/X3JIer4L27pg7VOttdcq0TXTwJMV2NbE3BhK3Fjf3URRFXlVXRRxetLiDxsNrXrsxwIV1papNDHzItE36MCBwr5zJPEuEwzAecYk48wt+TLEaBXQmF+NMzVXKHw1tCZXbSBDAWRj7p4W+dMy03ao6CevXzI5Pn4xgFGcpTZ4UZUa6nyZeACmmagLy8/jIusPQs/swkIXgGMR3dQGpgabyO0A7zlJfNCdO7tn8/kbiOjG6cXFZzYQXdJmDByAQmDVzYnIXNgI61SiI/jNe1YMvMxnrlRWJVydovpdoEY1x0Hsi5j7GomwKOLKEKSQZr9G93vbjhyZ0GoPY8ofDwGAnoMHH5xIJB5qZn7ict1gAsgC2szcYIGtJQR4RjSivhOEFX4p3HEP2F5YZqJiOAgNzK1OdSuAY4PBjhhR2JpPqCHA3QFgNpn8BSX6rdzi4q80G7OZAMyrYl5VF/wFe6pFV0EFQy0gKxwkVyJeVAWrZmoet1K9lJnLy/ANRCCI6F71D594tXU0w/dkkuiHDURPLMcNJr9kzywQXQIA+8/y6EqkQc6pAtA6dBGVATxslhTPlz2JrtlX8ngyAFQlLxWhpi/10W3b+nL9/R8Xoh+0EL0WRJunRdyUiAvLoIKWjIZqJKC5Ki5whXWkBPCiqirzRMnGX6sx31T2/fhFBBDVBwjQ/WsxmMF6VdUHuNyzTPVVhAnYCAC7UqlzhmI42GQZoHr6EMCeqj5UoVQOQHQtgI9F9FMbuMoWYWjFuclE4pYG5r9sIuqaFMGkiAWRWeEcvUBoZIURi5VtQ2iQ+1cUycU871itCRBAh5Z/T1xUhRA9CgC71vAkVVQf0UrsMp80288d32AlIit+/qmWpF0txzut6L+f6yzitCwA9QD81JYvhsB5/zg8FTQ/j9zftbH6QvKTyUTibzqM+Z2cKoK+tx5WsE1mmEQbJ+LCKjg3FabBqAeQJXr0qw89NFmre9kfnKITEK+gwJUsAIjMAb521Wpj6f6NyUlolpY//41nc5MBoOvSSx+ZPnLkClKlIoC4b0HSMvhFF8O/Pw2LABqC/16KePDfzqYIE4d/MFP6bx4BP10QKTJRbLmvMQG8oKpxoic8ua/v53Vk5D6sE7ls9fPgKrdY1loR+lTyYwLcZDL5iU5jXjnhnFXArFTjbQ0TAFS1mdkDgDmRw+zHg1bUCiyqlv1QFMj+q8jkTb6OYq2zFSpu1h7D+sZyJjsQmBiu5+fwpp072G7M4UaixEI5SZGqroXZKzLfTMAPdBlZ4fUAAqRemzeVtYsD5nrAjiUSf9tpzCsnrC3SOYQRKiA8X0hGVUHkNfp9KWAAzKseLABv9VQfNsz3FmrUl/h07K7u/kOfywFLqsHVE2AqBaTTUKBAKFvmRD2AikRt1T5fpdgV3r9zbex5COa33HBNYdkGRz0TYN/oaH4imfxhnCgRtA9cbla4yflu8M2Tvb17kE5P13M+YEkzoad2As8cF1FWZQEoNMuJT4orq9/xDCBS9pU+pJWZ5kW+3JnJDN8O8B1r1xjJEGDH+vpeucHzXjcZkF+1ZEd+f+DwuU0DETUFjXhmVWFVRxT4AYCvHzZm7xMffDA3lUwO4DzrE3FOAjlpBOTK7lCnKjFmnme+OCDTNTMcmOiSigq6VMHAspSgqM6l8rzgZd/HRC/VMnpMEEBFEdvteRvGgdsIeJfWJsl0xYw/BXhC5GPwvCs6cY6TgdNb2gTjooEK9h6cKq29qi48ILm+vs3C/DezIqL+QUel13PBi2AamU3IovOqcKo/mweGCNjPIt9pde6nNDqaLyXiKSK5UDPgCRgr13JSn3hAzu3EWp3AhwcvRE8st68MEflxENUTgSeyruEBgLH2WzPGlC3mCCIz65w0AG96tK/vw3vS6bHVTuxcDvYFPUtOJJO/1sV8xUSxuAgiU8apojQx87zqAz2ZzI9qJSZa6bojQMaZ39ptTFelDXgEEAa4ndkQgFnncguqP82r/kSJfhwjGmpvaDhABw7Mnm597k+laFdQS5xzzgkz6DxtnH3WMVT9WdmnqERkVSFhl7U1CMeEfWUmgIEK+spwQRXE/AiwtqfYNbGCFaD2Q4ceKqre3+y7gOVIcNOiqrYwd3nM778DkKoOGFYAtwO8K52WqW3bumLAu/OqAj9W5hHRsj4AuInIM8C3CNBQCmkNrD8iwB1NJDax6i0zvgS7qWDhujZm9oiwIPKlBZGXx2KxyzuHh6/tyGR+q3N4+IMtBw9+nw4cmN0bSmIF7woB7nrfylfAlwS64CzAsDMf0Ui5QggAeF4EBFz1aF/f5rBf9Wrd+l4/JYUmt29/cgNR/0IZfaXVTxzmBVVbBI6UGLXrlwCRSplA421vnAha5pbGRGZKxHUyv3ysr+9mSqf9/gp1gj2pFBMgRc97fxvzlgWRshuJL6X9qH72FBditREQb6PqCzuMaS/6Onzl9uN1XcaYgsj3VPXa9kzmxrZM5p9bHnzwEQVoX6D/Fy6UmwBH6bSlk02CTh0az2MuN5G+AtTZqanfD0UkMydSMP7msNwuaVRUdZ3GtMaNeUHpvK4GdqdSfg9I5pe1EjGCRurLvHeN+d8+Ol8s/uz8IMDABCeRz0w7l2cio+U/FM+LSBPzP5zo799J6bTVOlAKCdt1HksmX9VlzK9NiVgu02JSv3aT50X++/5LL/2eltTZrpXlIUQvEL/JUVnzJIB0MJtZ5/Y+2Nn5zI5M5rslQqlEgF6fTltKp+1NflPtx71+2KvDFYtxvsCswHBcug4dOkJEhxrK3ACYCEUATvW3yZ/XVXGDFaA96bSMXXZZGxHdMudbr6aM72vcf9YH+kZH86FI7romwMAEN92HDo064MvtzERl7ArhrlYAYIhaG1S/cOTyy3vCOMOaxf38BG17vL//51uJ/mHeVzUp/358FVyA6CPXp9N2rd1f3bKlGcA1ef/kuhxL1rUS0azI/T/MZm++cmiouM/PA3V0DrI7oyVx0jpu884DS6Dst2L37jDv9Ydx3yoqh8TMrIjrYB44nkz+KgGyr3K9h7I8iDsA4WLxti5jLsr7TdPLkfFSjwhKdG9wvXWvCH3KA5DqXxVUoRUUxjPAcyKumXlHe7H4L8d27mxdKxIMu9cf7u/f2gTcTUBzIVQ3KY901POFK6diRB8LrLC1SvYmABhrabksxrxl0Q9VlCPCSSAiK/KmQBjTu74KVeT9QT0pEW2MEdV9ukPNcfx4aPbtqzCAR0VV9VTfq1u3No2dLBVbqQ2UkU67sUsvvThG9Jacc1J2C8+TwhL71zQUVGsCDIiKu7PZe+ZF9rX7/QLKXuhMZKacsy3MT2teXPzK6LZtXQS41YwJairlXQ/YQ9u2bekAvhonunTel20vf7dSde1EJKofbh8eHtuXSnlrZvIHu60n8sQWn3BcGS+/NBPxrMhPe0ZGvnW7b/lXla60a2lN0Hb2Y8cXFP+Fbqth/ua0X0lV1jtOQdio0/P6T8Tj778JcEMDAyu2ToYGBgwByrHYB1qYO8tNXFdAG4h4TuS4jcW+fzKqcv5YgH7TbeCPra/4XKFPTd6Uc7aZ+boNsdi+Y8lkf3gwssI7HGng9j7S379zQyy2v5HoSTPldr8qmfAYEc+I5Fyx+D4FaFcdVJAIsKNswgnceFb9BgG6pxauS7D7E/AkqeZ9WeENZaUuHoSOuPPgwaxT/UELs5ZrNDCRmXTOdjG/9ngi8fIrg+5tNR+DgYHYlUNDxfFk8ve7jPmVSmLhUHWtfsz5GxsffDAXhAD0vCHA0F1tz2bvmRO5u4PZSJmxwJOWMnmTzjmP+edagf+YTCZ/NThJ1FoToQKkgWVGgJ3q79/dAdzjET2hUvILwh2uzRi2Iu/bePjwI9i9e8XzG83yDjUuqcTaUl+C6ac1JACngBHgqsUKwyblmBCVymGthlXORJ+KUWVmsAJmXsS1MH/4WDJ5LdWQBBWgULr+eDL5smai/zMt4lBBWEqJuOhXTX0SADA4iPMB/Jh1ApAAfzCvmo/53d8qYnkmMrMiTog2NjF/PpdMfnCmv3/jaUTIFU9scHpJgFI6bU/s2HFJLpn8SBPRXgd0zapKxeTnJz6bKece7m5q+j8KMAYH19b6O2lxdSnKFPAgIue7axO1iN2Ep8ZT/f1XxIh2lJNLdhYyWY9usF9FQ7R3yrlpj7nsDAoCqOi/z82tRP86lkxeH3aJq6aONoy909BQcay//5WtRJ8sqIqrQAMyCKHQjHOZ7sbGbwUGjJx3BBhYOLwpmz246Nw7240xWqEVGFzPLKrqnIi0MN9Kqj/KJRKvP9Hf3x7mloVxu30nc8+4pC9t+GE9mZAb5i06Alyur2/zbCLxjrjIj1uYb5kVkUD4s+KXh1Ql7nfA+r2gEqKeapzjivLbDQZvbANwdhXfZZIVEaAi8qo2ZkIV78h6BgWnwe3Dw2Oi+sl23wp0FVyH86oiQGcz8NWpZPJ1wfstpWlKZRgGTIDbA9B0Mvkn7USfWFTlYiAEWoH7IE3MRET/QAcOFMLc4fNhDs8UdBUFDEZG/mIykXhhhzFPn66i92sw4DThnIszX9LC/Ncq8sZcMvkJYv5s68GD99O564dPad2o/f3xHPA0Ur1JgJvamTfkVDERuLzVrG5Rtd3GeOPODW7MZj+vdSbzxZXsvIEMO4BtgQw7Ki3AD04T5WgisckjumXGOQWRwYWKwUFVgKaZ35cTeY0hirkyGoyVzCsv+mrLDe3Mf5vr73+BEN1OBw/ee8rYB273/uDfdp20RsN+zg4AJpPJ6z2iP2shevqUiGil5AdIA7OZsnbMWPthBQjnkf6nd8ZdLVAGOcb8qrzID+NErYVypLIexyUu+F3GpJG5t4XoHVMib59KJu8nonug+oMi0UOmWHyUnJtZbG8vsHMUd64x71xXjGgrEe0EcM2M6tNjRMlGZsyqYtw5R0TMVS5EAaSR2eREjsY977bABamLnS602hzRPPlW6rIljMhvXwAATydAtUIXWAHCwIChoaHiONF72pg7J6qIs54nVqDo7t2mc3AwM55M/kO3Mb87bq2lCuqz2Q8/6ZSItDP/0oLqDTP9/V8yRB8txmJpOnBg4mxJ01Nbt3bHGhuvF+A1DPyyR1S1USCq0mqMNyHy3p6HH57U3bsNDQ6evwS4NKmAoeHhzFgy+epOos9bVSsV5NKdHu8gnwhlUUTI15h7apzoqUqEBVUsGlOA5815i4sF+B3oGg1za6hFpwDypzb3MbVYgOrrtEmMyMs79+oNmcyJ1bb+zvZDoYYbAcc5GIcyCtjNnN+L9hePXH55Dx54YLJcOa8gpiQ0NFScSCRe38L861MiFzT5lViBogBPF4t3TAMva2LelK/QYAjWl5nxk5RNO/ONCtxYyOfHJpPJH6nqf4LoEFQnGVABOkG0nVSvUKJfaCDaBAAzIqqqWs38KCDNzGbS2uG5QuHv6iIWvhoEGEyEC0rJvnAimXxbjzHvmrS2iCp1504ahMQAdF5Vg65UBIANUQMTNYSLWwLrZV5V5v3aVygRs9/JrGZ5UwS4DmO8E9a+eePIyDdCBZm6C9qqHiq3NwYBVBBxPZ7XaQuF/03AOx/q74/vGR4unC2Wc3pT9X2AN5NMvquJ+Q9m/coaXq2jWS2z7G/VY4EAdz788OR4X9/r2zxvb97vx8JVXNMAwLQ/ztTAvLGJ6AaP6Ab1FVyWYrsUNK7Pq2LGP+VF0PSKqnwuiRF5BaLXbTtyZCEwCC4MAgR8SWsFPMpk/vxEMnlpj+f99kQNxDdP8c78CgUusYLUnWGBl7ZurPmiUy12eV5s3Ln3bsxm36v1SH4n64D/u+CPHJc30MTTzkkT81smE4l/7xoe/hbgV82Enb32nz2mtMsD3t3CfM1UUFa4GuS3XpItCHD7UimvJ50ePJFIfLLH826uVKrsdCIkAEVVLapKmGoTZgEsZd4EBkStGmCJqu3xPG/cuTs3ZDJfC8omLc4zLGdy/Jc9k7ltMpls7/a8m2tMgmdyAVYNqlrs9rzYpLX/tCGbfbMCXj0GefcElpp43k9mrV0wQFM5wfagnzMYaPKIvjyTSPypNjR8oOOBB8Yf70Bksre3s8HzdgnwGiZ6gQfU5KDpfMWudNopwOPMt007d3Ur845Z1YoPEM/kGp8e961I0fnc5OfajfGmnfvx/OLiG4Lwx3l50u8tY+BVg6x3ZDKvmkokvG7Pe9lKkuBqk9+Mc5/qzmZ/M5zoejzivyPQjaMHH3xkIpn8zybmq+dEBGUsLgaoEJw0dhjzzpli8X9PJJNfIeC/nOoYA0UF2hnYRkRXABiIMV9EYUzJV6Cpacxv2ZUgRFrv5XYE6F6Abxoenpno63upY/6PBqKmYpUHiKsJCXJgCyJjeeaXBK4v03kqduEtd2JDQ7srm335VDKZ7/a8V09YG/adXVcGgQJKqrbb82JTzn26M5N5ZSg1X9cTnUqZoOXAlxqIrplV1XItgPCkccI5iTNvbif69dKs1jPElCTIuzTrUfV5tW/4piBW2j0y8p9j27e/os3z7hbAWV9MtK7HTwBpICICZnPW3njR6GhW10m3xyo24OXvbgiDvZnMr0879/5uY7zgJGrdBEYlILkuz4tNO/ehrkzmFcE60brf5YIUiEbVT0w7lzdEXEmlDgEUpiVNOmcnnLPTInZKxE06ZyestTMiLkwoX8nG6st+cYrFdbOoQrWdjYcOfXHGude0MBsPEKnj90v8Aw8ygJ1x7kUXjY5+LygxPa+T3LnMhaPwzXzTmcm8YUr1DUHnMBbVug+QiqptJuJGIp4WeUtnJvNbYa7fejDxw/Sk5mz2Yav6kQ5juMpKHSqR/fcIMEutAJZp8WmQN7rirkodnwI/zthaTaW8TSMjH5ly7tZmnwRRj8aCAC5OxDFVOwO85KKRkW9qnWZBrCkBhiS4O1iIXcPD7y+IPBvASI8xnvq7XD1OsCggPZ7nKXBwUeTZncPD7wlifrrO4huqADcw75l2bizu15/KWo2rAShOK89O63ElhipIG7PZO2edu7kBsE1ErHVkLIiqbSUyrDozL/L8LcPDXwpVlXABoKLAbFiLq4DXlc3+2xTz1bMiH21l5hbfGnRaB0SogIQNgJqJeNa5O48Xi1d3ZbPf0pNqyOvNshAA1D48PFYEfqPJT6gUXeXnEFXbxsyiOltQPdhQhXDG+YyQBLuz2U/NATeQ6iMdxniiatdyvARQVbU9xngWeGjW2tSGkZFvBG6vvVDmh6tcjFYBc8lDD51oy2RuyTv3fFH9UbcxpomIxSfJ1Y4hqAa/20zEXcaYosj38iLPbstkbu0bHZ0KG4uv20UVBNo3ZjJfnHTuLZ1+LHZVNp1gbKXHX8QPM3A9VL/UyoyVFEXw1jG5LlmCmcz+SdWn50W+0eN5ngFIVl9IQlXVNhBRlzFeTnXvRD7/9M2joz/edwFZfjUhwHAxhioUHdnsl/+7s/OaBZHfEtUHuphNq++iQf0dT1ZsUgEJXAtqYzYdzMaq3r8g8mutmcy1gdVn1rSpUQ2xFGjPZt8z6dzb25i92ArFYtVfNE4BaWM2gbr0R6edu7ozm70PQBtWOEVlvbffDBuFXZLNPtyaydwwZe2bPWC2yxgTWGMr+k4Gc2gBULdPvsemVV/TPjz8sm1HjkzsBcz1F5DlVzMCPM0lNlcODRVbMpkPjVn78wsiry6KfKeBCN3GeE3+qWVIhk4rdN2CwLtA1YaT2kzEwcRKXuSbC6o33ZfJXNmayXwiIEhT7y4vl68lZxUw3ZnMu6ade4UHjHcb46H6DSfM/XSi6jyAOo0xLURcUP23vMiz2jKZWy4aGTmmfoXOBSmHVaGxwOqnk713wbkrF1T3NhFRhzGmBvP2uIaBAajLGK8BWJxz7gMnFhd/oWt4+CPh/dx0np/2nsWzqPkE+yU5o6N5AB8H8PG5Jzzhqlnndgvw/Aaina3GeKqKRVUUADi/tlGWsckTARwjoga/PpKJCNPOaVH1x+Lcl1jkrraRkf8sIcuQ+Nx5vKgMZbOfPtrb+10Xi70zBryi1fO8vAgW/LEN60NJTxO0CDYgLRl7YoAbiajR7z2CnMjMgupXVOQf27LZb4XjioEBpqGh4oR/3RVFbJ2dAp9lvgTwSxA3Hjr0IICXzezY8Xd51d/3gBe2eZ63IIL8yXkjlCFCoifT1WAAbmGmBj/+nZtT/Weo/nVbNvvT0rVxIW9K3gpMsKKECAEIPfTQDwD8QIG3zO3YccWsc9cpcK0CTxHVbYa5PU7E5uQkll5v6d8kSM4V1ck8MFpQvZ+Bf2eif28fHj5Q8hKc/O3VnmDVMDWZylBrqaqgaYkER0cPAfi1iUTivbPOvUKB5zHwpOYgDGFVYVVPSXo2fg4MmYDsHIAFkWJRZNQSfZ+BrxnP+2bLgw8+Et7rYCC4qa2tYUEqlz6zPv59PuaZubzn9FN3zvCeYBm/WYchDL+2/eDB7wD4Ti6ReMqsc68AcKMBdjb7YRwUVM/6EtOpGwUFycxYEMkvOvfDAtFdBhhsHh4+vLR5rcXauBAI8HQiBIC9gNmdShGl0xYHD/4YwI8B/J0CvJBIbLVE2xdFtitwiQAbWbXNAY3wXes8gBkCjhNwpIHokHreoXBBnkIkqZR3ehH/6m/xZJ1qkfz69XB86RyKvlZ8fT+pkgQZAFE2+xMAb1XgHfOJxM8vijxTiK4R1SdCdYsCbUrkMZAvikxYX17pCKtmlfm/Y8w/bSkUHgyseJQsmrAb3aljy5yD6iz5Qf14INSwZLWUWCUKXz5f4bvXqkTLijsViIRVFwMlFBMUwZ6L30RUw44AdWsNLqVjhfO2c+ftuWLxafMizwHRdar6JBB1n+kdIr8QAQCUfVXpo3mRH4E5zarfavOviVN+JyK+Jfx/mi0HV9lRwJ8AAAAASUVORK5CYII=";

// ─── DESIGN TOKENS — fiel al master: blanco puro, rojo Claro, tipografía limpia
const C = {
  // Claro brand reds (exact from master PNG and slides)
  red:      "#DA291C",   // Claro primary red
  redH:     "#C0392B",   // header/dark red (from master slide headers)
  redLight: "#FEF2F2",   // very light red tint for active states
  redBorder:"#FECACA",
  // Whites & neutrals — pure and clean, NO dark backgrounds
  white:    "#FFFFFF",
  bg:       "#F7F6F4",   // barely-warm off-white page bg
  bgCard:   "#FFFFFF",
  bgStripe: "#FAFAF9",
  border:   "#E4E2DE",
  borderSm: "#EEECE9",
  // Text
  ink:      "#18181B",
  inkMid:   "#52525B",
  inkSoft:  "#A1A1AA",
  inkFaint: "#D4D4D8",
  // Gold accent
  gold:     "#D4A843",
  goldLight:"#FEF3C7",
  // Maturity level colors — exact from master bottom legend
  L: [
    { c:"#EF4444", bg:"#FEF2F2", border:"#FECACA", text:"#991B1B", label:"Inicial"    }, // 1
    { c:"#F97316", bg:"#FFF7ED", border:"#FED7AA", text:"#9A3412", label:"Básico"     }, // 2
    { c:"#EAB308", bg:"#FEFCE8", border:"#FEF08A", text:"#854D0E", label:"Definido"   }, // 3
    { c:"#22C55E", bg:"#F0FDF4", border:"#BBF7D0", text:"#166534", label:"Gestionado" }, // 4
    { c:"#3B82F6", bg:"#EFF6FF", border:"#BFDBFE", text:"#1E40AF", label:"Optimizado" }, // 5
  ],
};
const lv = v => C.L[(v||1)-1];

// ─── DATA ──────────────────────────────────────────────────────────────────────
const RUBROS = [
  { key:"red_movil",    label:"Red Móvil",    icon:"📡", sub:"PEN · ODH · Crecimiento Orgánico · OyM Móvil" },
  { key:"red_fija",     label:"Red Fija",      icon:"🔌", sub:"Brownfield · Greenfield · HFC · OyM Fija" },
  { key:"transmision",  label:"Transmisión",   icon:"🔗", sub:"MW · Backbone · Troncal FO · Puertos" },
  { key:"nube_publica", label:"Nube Pública",  icon:"☁️", sub:"Datacenter · OCI · Obras Civiles · OyM" },
  { key:"nube_telco",   label:"Nube Telco",    icon:"🖥️", sub:"Telco Cloud · Crecimiento Orgánico" },
  { key:"it",           label:"IT",            icon:"💻", sub:"Salesforce · Analítica · Jugadas Estratégicas" },
  { key:"umm",          label:"UMM",           icon:"📦", sub:"Clientes FTTH · DTH · Migraciones" },
  { key:"umc",          label:"UMC",           icon:"🏗️", sub:"Proyectos de construcción y despliegue" },
];

const CRITERIOS = [
  { num:"01", key:"alineacion", icon:"🎯", label:"Alineación Estratégica",
    desc:"Grado en que las iniciativas CAPEX están vinculadas a objetivos estratégicos del negocio y roadmaps tecnológicos.",
    vinc:"Levantamiento: Entendimiento de estrategia e impacto en NPS, ARPU e indicadores financieros",
    ndesc:["Sin vínculo formal entre inversión y estrategia. Proyectos ad-hoc sin validación estratégica.","Lineamientos generales de negocio pero sin traducción clara a objetivos por área tecnológica.","Roadmap por paquete aprobado. CAPEX alineado a hitos del plan estratégico.","Revisión periódica con ajuste presupuestal formal, documentado y con KPIs de alineación.","CAPEX integrado al ciclo de planeación estratégica con feedback loop continuo y benchmarks."],
    subs:[
      {id:"a1",t:"¿Las inversiones CAPEX están vinculadas explícitamente a objetivos estratégicos cuantificables (NPS, ARPU, cobertura, cuota de mercado)?",p:1.2,
       opp:"Crear una matriz CAPEX-KPI donde cada inversión tenga al menos un indicador de negocio comprometido (ej. +X puntos NPS, +Y% cobertura 5G, reducción de OPEX en Z%). Esto le da estructura al presupuesto y facilita la defensa del plan ante la dirección."},
      {id:"a2",t:"¿Existe un roadmap tecnológico por paquete aprobado formalmente como guía para la construcción del presupuesto CAPEX?",p:1.2,
       opp:"Sin roadmap aprobado por paquete, el CAPEX se construye bottom-up desde operaciones y pierde coherencia con la estrategia. Un roadmap por paquete reduce en ~30% las revisiones de alcance durante el año."},
      {id:"a3",t:"¿Se realiza revisión periódica (al menos anual) del alineamiento entre el plan estratégico y el presupuesto CAPEX aprobado?",p:1.0,
       opp:"Una revisión anual estructurada detecta inversiones que ya no responden a la estrategia vigente — en promedio el 15–20% del presupuesto construido queda desalineado entre ciclos sin este proceso."},
      {id:"a4",t:"¿Existen KPIs de alineación estratégica que midan si los proyectos CAPEX están entregando el valor comprometido al negocio?",p:1.0,
       opp:"Sin KPIs de valor, el CAPEX se evalúa solo por ejecución presupuestal, no por impacto. Definir 2–3 KPIs por categoría permite medir si los COP invertidos generan el retorno comprometido."},
      {id:"a5",t:"¿Las brechas entre la estrategia y la capacidad de inversión son identificadas, cuantificadas y escaladas formalmente?",p:0.9,
       opp:"Cuantificar formalmente las brechas de inversión permite construir un presupuesto realista: saber que faltan COP X para cumplir el objetivo de cobertura es diferente a intuirlo. Evita que proyectos estratégicos queden sin asignación por falta de visibilidad en la construcción del plan."},
      {id:"a6",t:"¿Las áreas de negocio y comerciales participan activamente en la definición y validación de los proyectos CAPEX?",p:0.8,
       opp:"En telcos, el 35–45% de proyectos CAPEX con mayor desviación son aquellos donde operaciones define la inversión sin input comercial. Incorporar a las áreas de negocio en la construcción del presupuesto reduce este riesgo y mejora la calidad de los estimados."},
      {id:"a7",t:"¿El plan CAPEX multianual (3–5 años) está alineado con la visión de largo plazo y revisado en ciclos IBP?",p:0.8,
       opp:"Un plan multianual integrado al IBP permite comprometer contratos marco con proveedores estratégicos (ej. Ericsson, Nokia, AWS) con 12–18 meses de anticipación, logrando ahorros de 8–15% en precios de equipos."},
    ]},
  { num:"02", key:"granularidad", icon:"🔬", label:"Granularidad y Desagregación",
    desc:"Nivel de detalle con el que se construye el presupuesto: por proyecto, subproyecto, componente tecnológico o categoría de gasto (PxQ).",
    vinc:"Levantamiento: Nivel de granularidad · DVB: Categorías, paquetes, drivers y PxQ · Árbol CAPEX",
    ndesc:["Presupuesto agregado por área tecnológica. Sin desagregación de proyectos ni componentes.","Detalle a nivel de proyecto pero sin clasificación por tipo de activo ni categoría.","Desglose por proyecto, tipo de activo (HW, SW, civil) y categoría tecnológica definida.","Detalle por subproyecto, fase, proveedor y WBS estructurado con drivers PxQ.","Granularidad a nivel SKU/componente con trazabilidad end-to-end y OBS/WBS integrado."],
    subs:[
      {id:"g1",t:"¿El presupuesto está desagregado hasta nivel de proyecto individual, con identificación de tipo de activo (HW, SW, obra civil)?",p:1.2,
       opp:"Sin desagregación por tipo de activo (HW/SW/civil), es imposible renegociar con proveedores o detectar dónde se generan los sobrecostos. Proyectos de fibra sin desglose civil vs. equipo típicamente acumulan 20–25% de desviación no explicada."},
      {id:"g2",t:"¿Se utilizan plantillas PxQ estandarizadas por tipo de proyecto o tecnología (nodo 5G, km de fibra, rack de datacenter)?",p:1.2,
       opp:"Las plantillas PxQ estandarizadas reducen el tiempo de formulación de presupuesto por paquete de semanas a días, y permiten comparar eficiencia entre regiones: ¿por qué un km de fibra cuesta 2x más en una región que en otra?"},
      {id:"g3",t:"¿Existe un árbol CAPEX y catálogo vigente de categorías y paquetes que estructure el presupuesto consistentemente?",p:1.1,
       opp:"Un árbol CAPEX desactualizado genera duplicidades entre paquetes (ej. inversión en transporte contada en Red Móvil y Transmisión simultáneamente). Un catálogo vigente elimina estas duplicidades y mejora la calidad del consolidado."},
      {id:"g4",t:"¿El nivel de granularidad permite identificar inversión por región geográfica, segmento de cliente o unidad de negocio?",p:1.0,
       opp:"Sin granularidad geográfica no se puede construir un presupuesto territorializado. Esta vista permite distribuir el CAPEX por región con criterios técnicos reales (demanda, cobertura, estado de red) y no solo por histórico del año anterior."},
      {id:"g5",t:"¿Las categorías de inversión (CAPEX directo, indirecto, OPEX capitalizado) están definidas y aplicadas consistentemente?",p:1.0,
       opp:"La mezcla incorrecta de CAPEX directo, indirecto y OPEX capitalizado puede distorsionar el EBITDA reportado en hasta 5–8 puntos porcentuales. La consistencia en categorías protege la integridad financiera ante auditorías y reguladores."},
      {id:"g6",t:"¿Se realizan reconciliaciones entre lo presupuestado PxQ y la ejecución real para calibrar precisión futura?",p:0.9,
       opp:"Las reconciliaciones PxQ vs. ejecución real revelan cuáles drivers son precisos y cuáles se sobreestiman sistemáticamente. En telcos, los drivers de obra civil suelen tener un sesgo optimista de 20–30% que se corrige con este proceso."},
      {id:"g7",t:"¿Los drivers de estimación están documentados y permiten trazabilidad completa desde el monto hasta los supuestos de base?",p:0.9,
       opp:"La falta de trazabilidad de drivers es el principal obstáculo cuando cambia el equipo de planeación. Documentar los supuestos permite que un analista nuevo reconstruya el presupuesto en horas, no en semanas."},
      {id:"g8",t:"¿Se realizan análisis de sensibilidad de drivers ante cambios externos (inflación, tipo de cambio, precios de equipos)?",p:0.7,
       opp:"Una depreciación del 10% en el tipo de cambio puede impactar entre 3–7% del CAPEX total en una telco con equipos importados. Sin análisis de sensibilidad, este riesgo llega como sorpresa al cierre del trimestre."},
    ]},
  { num:"03", key:"aprobacion", icon:"✅", label:"Proceso de Aprobación de CAPEX",
    desc:"Solidez del proceso mediante el cual los proyectos son identificados, documentados, evaluados técnicamente y formalmente incorporados al presupuesto CAPEX del ciclo.",
    vinc:"DVB: Categorías, paquetes, drivers y PxQ · Modelo de Gobierno TO-BE · Acta validación paquete piloto",
    ndesc:["Sin proceso formal. Proyectos entran al presupuesto por solicitud directa sin documentación ni evaluación técnica.","Listado de proyectos con descripción básica pero sin ficha técnica estandarizada ni criterios de validación.","Ficha técnica estándar por proyecto, validación de alcance y estimados, aprobación documentada por nivel.","Proceso estructurado con estimación detallada de alcance, cronograma, supuestos y riesgos técnicos validados.","Proceso de construcción integrado con WBS, OBS, drivers PxQ y trazabilidad completa desde supuesto hasta monto."],
    subs:[
      {id:"ap1",t:"¿Existe un proceso formal para identificar, registrar y evaluar proyectos candidatos al presupuesto CAPEX?",p:1.2,
       opp:"Sin proceso formal, los proyectos entran al presupuesto por influencia política o urgencia operativa. Formalizar la identificación asegura que cada proyecto ingrese con documentación técnica mínima y que el presupuesto consolidado sea consistente y auditable."},
      {id:"ap2",t:"¿Se elabora una ficha técnica estándar por proyecto antes de su inclusión al presupuesto, con estimación de alcance, cronograma, supuestos y riesgos técnicos?",p:1.2,
       opp:"Una ficha técnica estándar es la base mínima para construir un presupuesto confiable. Sin ella, los estimados de costo, alcance y cronograma varían según quien los elabora, generando un presupuesto inconsistente que se desvía desde el primer mes de ejecución."},
      {id:"ap3",t:"¿Existe un proceso estandarizado de estimación de costos por proyecto que incluya desglose por componente (HW, SW, obra civil, servicios) antes de ser incluido en el presupuesto?",p:1.1,
       opp:"Un proceso estandarizado de estimación de costos elimina la inconsistencia entre áreas: que Red Móvil y Transmisión usen metodologías distintas para estimar el mismo tipo de obra genera un presupuesto no consolidable. La estandarización es el fundamento de la precisión."},
      {id:"ap4",t:"¿Existen umbrales de aprobación por monto, con instancias de autorización diferenciadas por nivel (operativo/táctico/estratégico)?",p:1.1,
       opp:"Sin umbrales diferenciados, el 70% del tiempo del comité ejecutivo se consume en proyectos pequeños que podrían aprobarse en nivel operativo. Los umbrales liberan agenda directiva para las decisiones que realmente la requieren."},
      {id:"ap5",t:"¿El proceso de aprobación genera actas formales con compromisos, responsables y plazos auditables?",p:1.0,
       opp:"Las actas formales con responsables y plazos son el único mecanismo que convierte una decisión de comité en un compromiso ejecutable. Sin ellas, el 40% de los acuerdos no se implementa en el plazo definido."},
      {id:"ap6",t:"¿Existe un repositorio centralizado y actualizado de fichas de proyecto CAPEX accesible para todas las áreas que participan en la construcción del presupuesto?",p:0.9,
       opp:"Un pipeline visible permite detectar en tiempo real cuándo hay capacidad presupuestal liberada (por cancelaciones o retrasos) y reasignarla a proyectos en lista de espera, evitando subejecución al cierre del año."},
      {id:"ap7",t:"¿Se realiza una validación de cierre de proyecto que confirme que el alcance ejecutado corresponde al alcance presupuestado y que los activos fueron correctamente registrados?",p:0.8,
       opp:"La validación de cierre confirma que lo ejecutado coincide con lo presupuestado y que los activos están correctamente registrados en el balance. Sin este paso, el CAPEX queda en proceso de capitalización por meses, distorsionando el balance y el presupuesto del siguiente ciclo."},
    ]},
  { num:"04", key:"forecast", icon:"📈", label:"Exactitud del Forecast",
    desc:"Precisión histórica del CAPEX presupuestado vs. ejecutado y capacidad de anticipar y gestionar desviaciones durante el año.",
    vinc:"DVB: Construcción del modelo de gestión y seguimiento · Reforecast y KPIs de ejecución por paquete",
    ndesc:["Desviaciones >40%. Sin seguimiento sistemático de ejecución vs. presupuesto.","Desviaciones 25–40%. Revisión semestral sin reforecast ni análisis de causas.","Desviaciones 15–25%. Reforecast trimestral con causas de desviación documentadas.","Desviaciones 5–15%. Reforecast mensual con KPIs de ejecución por paquete.","Desviaciones <5%. Forecast dinámico con modelos predictivos y alertas tempranas."],
    subs:[
      {id:"f1",t:"¿Se mide sistemáticamente la desviación CAPEX presupuestado vs. ejecutado con seguimiento mensual por proyecto y paquete?",p:1.2,
       opp:"El seguimiento mensual por paquete detecta en el mes 2–3 lo que sin seguimiento solo se ve en el mes 9, cuando ya no hay tiempo de corregir. Telcos con este proceso logran subejecuciones <8% vs. >20% en las que no lo tienen."},
      {id:"f2",t:"¿Existe un proceso formal de reforecast con periodicidad definida que permita reprogramar ante desviaciones relevantes?",p:1.2,
       opp:"El reforecast formal permite reasignar presupuesto liberado (por retrasos de proveedor o cambios regulatorios) a proyectos con mejor ritmo de ejecución, manteniendo la ejecución global por encima del 90% del plan."},
      {id:"f3",t:"¿Las causas de desviación son clasificadas y documentadas sistemáticamente (retrasos de proveedor, cambios de alcance, etc.)?",p:1.1,
       opp:"Clasificar causas de desviación revela si el problema es sistémico (mismo proveedor retrasa múltiples proyectos) o puntual. Esta información es la base para renegociar SLAs contractuales y mejorar la selección de proveedores."},
      {id:"f4",t:"¿Existen KPIs de ejecución presupuestal accesibles en tiempo real para los responsables de cada paquete tecnológico?",p:1.0,
       opp:"Los KPIs en tiempo real eliminan el lag de 3–4 semanas entre que ocurre una desviación y que llega al reporte mensual. Este lag es exactamente el tiempo que se pierde para tomar acción correctiva."},
      {id:"f5",t:"¿Se utilizan datos históricos de ejecución (mínimo 3 años) para calibrar estimados y mejorar el forecast del siguiente ciclo?",p:1.0,
       opp:"El sesgo optimista en los estimados de CAPEX (subestimar costos y plazos) es universal. Calibrar con 3+ años de histórico reduce este sesgo hasta en 40%, mejorando la credibilidad del área ante el CFO y el board."},
      {id:"f6",t:"¿Existen alertas automáticas ante desviaciones relevantes (>10% acumulado) durante la ejecución del presupuesto?",p:0.9,
       opp:"Las alertas automáticas ante desviaciones >10% permiten escalar en días, no en semanas. En proyectos de infraestructura con hitos contractuales, esta diferencia puede evitar penalidades por incumplimiento."},
      {id:"f7",t:"¿Se realizan análisis de sensibilidad ante cambios en variables clave (tipo de cambio, precios de equipos, demanda)?",p:0.7,
       opp:"Una depreciación inesperada del COP o un alza en precios de semiconductores puede invalidar el presupuesto aprobado en semanas. Los análisis de sensibilidad permiten activar planes de contingencia antes de que el impacto sea irrecuperable."},
    ]},
  { num:"05", key:"riesgos", icon:"⚠", label:"Gestión de Riesgos",
    desc:"Capacidad de identificar, cuantificar y gestionar riesgos que puedan afectar el monto, cronograma o alcance del CAPEX.",
    vinc:"Levantamiento: Modelo de gestión CAPEX · DVB: Gestión y seguimiento · Registro de riesgos y planes de mitigación",
    ndesc:["Sin análisis de riesgos. Sin provisiones para contingencias en el proceso de presupuestación.","Contingencia genérica (% fijo global) sin análisis diferenciado por proyecto o paquete.","Análisis por proyecto con contingencias diferenciadas según categoría tecnológica.","Registro activo, planes de mitigación y contingencias revisadas trimestralmente.","Simulación Monte Carlo / análisis de sensibilidad integrado al proceso de aprobación."],
    subs:[
      {id:"r1",t:"¿Existe proceso formal de identificación y análisis de riesgos que afecten el presupuesto CAPEX (retrasos, sobrecostos, regulatorio)?",p:1.2,
       opp:"Sin identificación formal de riesgos, los proyectos CAPEX en telco enfrentan sus principales amenazas sin plan: retrasos en permisos municipales, escasez de equipos por crisis de supply chain, o cambios regulatorios de última hora."},
      {id:"r2",t:"¿Las contingencias están diferenciadas por tipo de proyecto o paquete (no un % genérico global)?",p:1.1,
       opp:"Aplicar el mismo % de contingencia a un proyecto de fibra urbana y a uno de nube pública es equivalente a no tener contingencia diferenciada. Los proyectos de obra civil tienen 3–4x más variabilidad que los de software — la contingencia debe reflejarlo."},
      {id:"r3",t:"¿Se mantiene un registro activo de riesgos por proyecto con planes de mitigación y responsables asignados?",p:1.1,
       opp:"Un registro activo de riesgos con responsable nombrado convierte 'puede pasar' en 'alguien está encargado de que no pase'. Sin responsable, el 80% de los riesgos identificados no tiene seguimiento real."},
      {id:"r4",t:"¿Los riesgos y planes de mitigación son revisados con periodicidad definida en instancias formales del comité CAPEX?",p:1.0,
       opp:"La revisión periódica de riesgos en comité detecta cuando un riesgo latente se convierte en inminente, permitiendo activar mitigaciones antes del impacto. Sin revisión, la primera señal suele ser el retraso ya materializado."},
      {id:"r5",t:"¿Se realizan análisis de sensibilidad ante la materialización de riesgos clave (tipo de cambio, licencias, suministro global)?",p:0.9,
       opp:"Para una telco con CAPEX en USD/EUR y flujos en COP, una devaluación del 15% puede representar COP 50–100B de impacto no presupuestado. Cuantificar este riesgo con antelación permite negociar coberturas o ajustar el plan."},
      {id:"r6",t:"¿El proceso incorpora lecciones aprendidas de proyectos anteriores para mejorar la gestión de riesgos actuales?",p:0.8,
       opp:"Las lecciones aprendidas son el activo más subvalorado en construcción de presupuesto CAPEX. Saber que los proyectos de migración HFC tienen un 35% de sobrecosto histórico cambia radicalmente los estimados del siguiente ciclo — sin este input, el presupuesto repite los mismos errores."},
      {id:"r7",t:"¿Existe metodología de valoración de riesgos (probabilidad × impacto) aplicada consistentemente en todos los proyectos?",p:0.7,
       opp:"Sin metodología uniforme de probabilidad × impacto, cada área califica sus riesgos con criterios distintos y la comparación entre proyectos es imposible. La estandarización permite al comité tomar decisiones de mitigación con base en valor en riesgo real."},
    ]},
  { num:"06", key:"gobernanza", icon:"🏛", label:"Gobernanza CAPEX",
    desc:"Madurez del modelo de gobernanza para aprobación, seguimiento, reprogramación y cierre de proyectos CAPEX por paquete tecnológico.",
    vinc:"DVB: Proceso óptimo CAPEX, RACI y Torre de Control integrado a IBP · Modelo de gobierno TO-BE",
    ndesc:["Sin instancias formales. Decisiones ad-hoc sin trazabilidad ni RACI definida.","Comité esporádico. Actas sin seguimiento de acuerdos ni responsables.","Comité CAPEX periódico con roles, umbrales de aprobación y actas formales.","Governance multinivel (operativo, táctico, estratégico) con dashboards integrados.","Governance integrado al IBP con revisiones en hitos clave del ciclo presupuestal, calendario oficial y Torre de Control activa."],
    subs:[
      {id:"go1",t:"¿Existe un modelo de gobernanza CAPEX formalizado con RACI para cada etapa del ciclo presupuestal?",p:1.2,
       opp:"Sin RACI, los procesos de aprobación CAPEX acumulan delays porque nadie sabe con certeza quién debe decidir en cada etapa. En telcos, esto genera colas de aprobación que retrasan el inicio de proyectos entre 4–8 semanas."},
      {id:"go2",t:"¿Se realizan comités CAPEX periódicos con umbrales de aprobación por nivel de inversión y actas formales?",p:1.2,
       opp:"Los comités CAPEX sin umbrales definidos consumen tiempo directivo en decisiones que deberían resolverse operativamente. Un modelo bien calibrado reduce la agenda ejecutiva en CAPEX en 40–50% sin perder control sobre las decisiones críticas."},
      {id:"go3",t:"¿Existe una Torre de Control centralizada que consolide, valide y priorice el portfolio CAPEX?",p:1.2,
       opp:"Sin Torre de Control, cada paquete gestiona su CAPEX de forma aislada y el CFO no tiene visibilidad consolidada en tiempo real. La Torre de Control es la única manera de detectar solapamientos, reasignar recursos y anticipar cierres de año."},
      {id:"go4",t:"¿El proceso de governance CAPEX está integrado formalmente con los ciclos de IBP y el calendario presupuestal?",p:1.1,
       opp:"El desacople entre el governance CAPEX y el IBP genera el problema más costoso en planeación: decisiones de inversión que se toman fuera del ciclo presupuestal y terminan como adiciones no financiadas o cambios de alcance de último minuto."},
      {id:"go5",t:"¿El modelo incluye instancias diferenciadas por nivel (operativo, táctico, estratégico) con dashboards específicos?",p:1.0,
       opp:"Un dashboard operativo con granularidad de proyecto y un dashboard estratégico con visión de portafolio son herramientas distintas para audiencias distintas. Mezclarlos satura a los ejecutivos con información que no pueden consumir y oculta las señales críticas."},
      {id:"go6",t:"¿Existe proceso formal de cierre de proyectos con reconciliación financiera y captura de lecciones aprendidas?",p:0.9,
       opp:"El cierre formal de proyectos es el paso que más frecuentemente se omite en telcos. Sin él, los activos quedan en proceso de capitalización por meses, afectando el balance, y las contingencias no liberadas distorsionan el presupuesto del siguiente ciclo."},
      {id:"go7",t:"¿Hay un calendario presupuestal oficial con hitos de entrega, revisión y aprobación respetado por todas las áreas?",p:0.8,
       opp:"Sin calendario presupuestal respetado, el proceso de consolidación se convierte en una carrera de último minuto donde el 30–40% de los proyectos entra sin revisión adecuada. La calidad del presupuesto consolidado es directamente proporcional al cumplimiento del calendario."},
      {id:"go8",t:"¿Los acuerdos de comités CAPEX tienen responsables nombrados y se verifica su cumplimiento en la siguiente sesión?",p:0.7,
       opp:"Verificar el cumplimiento de acuerdos en la siguiente sesión es el mecanismo más simple y más ignorado de accountability. Sin este seguimiento, el comité CAPEX se convierte en un foro de presentación, no en un órgano de decisión con consecuencias."},
    ]},
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const wavg = (subs, ans) => {
  let t=0, w=0;
  subs.forEach(s => { const v=ans[s.id]; if(v>0){t+=v*s.p; w+=s.p;} });
  return w ? t/w : 0;
};
const fmt = v => v > 0 ? v.toFixed(1) : "—";

// ─── MINI RADAR ───────────────────────────────────────────────────────────────
const Radar = ({ scores, size=200 }) => {
  const cx=size/2, cy=size/2, r=size*0.30, n=CRITERIOS.length;
  const ang = i => Math.PI*2*i/n - Math.PI/2;
  const gp  = f => CRITERIOS.map((_,i)=>{ const a=ang(i); return `${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`; }).join(" ");
  const vals = CRITERIOS.map(c => scores[c.key]||0);
  const dp = vals.map((v,i) => {
    const f=Math.max(v,0.04)/5, a=ang(i);
    return `${i===0?"M":"L"}${cx+r*f*Math.cos(a)},${cy+r*f*Math.sin(a)}`;
  }).join(" ")+"Z";
  return (
    <svg width={size} height={size} style={{overflow:"visible", display:"block"}}>
      {[.2,.4,.6,.8,1].map((f,i)=>(
        <polygon key={i} points={gp(f)} fill={i%2===0?"rgba(218,41,28,0.03)":"none"} stroke="#E4E2DE" strokeWidth={1}/>
      ))}
      {CRITERIOS.map((_,i)=>{ const a=ang(i); return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="#E4E2DE" strokeWidth={1}/>; })}
      <path d={dp} fill="rgba(218,41,28,0.12)" stroke="#DA291C" strokeWidth={2} strokeLinejoin="round"/>
      {vals.map((v,i)=>{ if(!v) return null; const f=v/5, a=ang(i); return <circle key={i} cx={cx+r*f*Math.cos(a)} cy={cy+r*f*Math.sin(a)} r={4} fill="#DA291C" stroke="white" strokeWidth={2}/>; })}
      {CRITERIOS.map((c,i)=>{ const a=ang(i), lx=cx+(r+28)*Math.cos(a), ly=cy+(r+28)*Math.sin(a); return <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" style={{fontSize:8.5, fontWeight:700, fill:"#A1A1AA", fontFamily:"inherit"}}>{c.num}</text>; })}
    </svg>
  );
};

// ─── PROGRESS BAR ─────────────────────────────────────────────────────────────
const PBar = ({ v, color=C.red, h=3 }) => (
  <div style={{height:h, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
    <div style={{height:"100%", width:`${(v/5)*100}%`, background:color, borderRadius:99, transition:"width .4s ease"}}/>
  </div>
);

// ─── LEVEL BADGE ──────────────────────────────────────────────────────────────
const Badge = ({ v, sm }) => {
  if(!v) return null;
  const l = lv(v);
  const pad = sm ? "1px 7px" : "3px 10px";
  const fs  = sm ? 10 : 11;
  return (
    <span style={{display:"inline-flex", alignItems:"center", gap:4, padding:pad, background:l.bg, color:l.text, borderRadius:4, fontSize:fs, fontWeight:700, border:`1px solid ${l.border}`, whiteSpace:"nowrap", letterSpacing:"0.01em"}}>
      <span style={{width:fs===10?5:6, height:fs===10?5:6, borderRadius:"50%", background:l.c, flexShrink:0}}/>
      {v} · {l.label}
    </span>
  );
};

// ─── SCALE CARDS — like master slide vertical columns ─────────────────────────
const ScaleCards = ({ critKey, score }) => {
  const crit = CRITERIOS.find(x=>x.key===critKey);
  return (
    <div style={{marginBottom:22}}>
      <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:12}}>
        <div style={{width:3, height:14, background:C.red, borderRadius:99}}/>
        <span style={{fontSize:9.5, fontWeight:700, color:C.inkMid, textTransform:"uppercase", letterSpacing:"0.14em"}}>
          Escala de Madurez
        </span>
      </div>
      <div style={{display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:8}}>
        {C.L.map((lv, i) => {
          const active = score > 0 && Math.round(score) === i+1;
          return (
            <div key={i} style={{
              borderRadius:8,
              border:`1.5px solid ${active ? lv.c : lv.border}`,
              background: active ? lv.bg : C.white,
              overflow:"hidden",
              transition:"all .2s",
              boxShadow: active ? `0 0 0 3px ${lv.c}25` : "none",
            }}>
              {/* Colored header — exactly like master */}
              <div style={{background: lv.c, padding:"8px 10px", display:"flex", alignItems:"center", gap:7}}>
                <div style={{width:22, height:22, borderRadius:"50%", background:"rgba(255,255,255,0.22)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0}}>
                  <span style={{fontSize:12, fontWeight:900, color:"white"}}>{i+1}</span>
                </div>
                <span style={{fontSize:9.5, fontWeight:800, color:"white", textTransform:"uppercase", letterSpacing:"0.08em"}}>{lv.label}</span>
                {active && <span style={{marginLeft:"auto", fontSize:8, fontWeight:700, color:"white", background:"rgba(255,255,255,0.2)", padding:"1px 5px", borderRadius:3, flexShrink:0}}>ACTUAL</span>}
              </div>
              {/* Description */}
              <div style={{padding:"10px 10px 12px"}}>
                <p style={{fontSize:10.5, color: active ? lv.text : C.inkMid, margin:0, lineHeight:1.55}}>
                  {crit.ndesc[i]}
                </p>
              </div>
              {/* Progress dots at bottom — like master */}
              <div style={{padding:"0 10px 10px", display:"flex", gap:4}}>
                {[0,1,2,3,4].map(j => (
                  <div key={j} style={{flex:1, height:4, borderRadius:99, background: j<=i ? lv.c : C.borderSm}}/>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dvb_capex_claro_v1";

const emptyAns = () => {
  const o = {};
  RUBROS.forEach(r => { o[r.key]={}; CRITERIOS.forEach(c => c.subs.forEach(s => { o[r.key][s.id]=0; })); });
  return o;
};

const genId = () => crypto.randomUUID
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random()*16|0; return (c==='x'?r:(r&0x3|0x8)).toString(16);
    });

export default function DVB() {
  const [ans,        setAns]        = useState(emptyAns);
  const [drivers,    setDrivers]    = useState(() => { // texto abierto por paquete
    const o = {}; RUBROS.forEach(r => { o[r.key] = ""; }); return o;
  });
  const setDriver = (rk, v) => setDrivers(p => ({...p, [rk]: v}));
  const [rubro,      setRubro]      = useState(RUBROS[0].key);
  const [tab,        setTab]        = useState("intro");
  const [exp,        setExp]        = useState(CRITERIOS[0].key);
  const [mounted,    setMounted]    = useState(false);
  const [hydrated,   setHydrated]   = useState(false);

  // ── Supabase ──────────────────────────────────────────────────────────────
  const [assessId,   setAssessId]   = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [copied,     setCopied]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [inputId,    setInputId]    = useState("");
  const [idError,    setIdError]    = useState("");
  const [viewers,    setViewers]    = useState(1);
  const [bFilter,    setBFilter]    = useState("all"); // filtro tab brechas // contador de presencia
  const [rFilter,    setRFilter]    = useState("all"); // filtro tab resumen
  const saveTimer    = useRef(null);
  const channelRef   = useRef(null);

  // Presence — se activa cuando ya tenemos assessId
  useEffect(() => {
    if (!assessId) return;
    // Crea un canal por diagnóstico
    const channel = supabase.channel(`presence:${assessId}`, {
      config: { presence: { key: genId() } }, // ID único por pestaña
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setViewers(Object.keys(state).length);
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [assessId]);

  // Al montar: si hay ID en URL carga ese diagnóstico, si no muestra el modal
  useEffect(() => {
    setMounted(true);
    const urlId = getIdFromUrl();
    const hydrate = (payload) => {
      if (!payload) return;
      if (payload.ans)     setAns(payload.ans);
      if (payload.drivers) setDrivers(payload.drivers);
    };
    const fromLS = () => {
      try { const s = localStorage.getItem(STORAGE_KEY); if (s) hydrate(JSON.parse(s)); } catch {}
    };
    if (urlId) {
      setAssessId(urlId);
      loadAssessment(urlId)
        .then(data => { if (data) hydrate(data); else fromLS(); })
        .catch(() => fromLS())
        .finally(() => setHydrated(true));
    } else {
      fromLS();
      setShowModal(true);
      setHydrated(true);
    }
  }, []);

  // Confirmar ID elegido
  const confirmId = () => {
    const clean = inputId.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\-_]/g, "");
    if (!clean || clean.length < 2) { setIdError("Mínimo 2 caracteres (letras, números, guiones)"); return; }
    setAssessId(clean);
    setIdInUrl(clean);
    setShowModal(false);
    setIdError("");
  };

  // Guarda en localStorage + Supabase (payload unificado con ans + drivers)
  useEffect(() => {
    if (!hydrated) return;
    const payload = { ans, drivers };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(payload)); } catch {}
    if (!assessId) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async () => {
      try {
        await saveAssessment(assessId, payload);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } catch { setSaveStatus("error"); }
    }, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [ans, drivers, hydrated, assessId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).catch(()=>{});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const set  = (rk,sid,v) => setAns(p => ({...p, [rk]: {...p[rk], [sid]:v}}));
  const cs   = (rk,ck)   => wavg(CRITERIOS.find(c=>c.key===ck).subs, ans[rk]);
  const rs   = (rk)      => { const vs=CRITERIOS.map(c=>cs(rk,c.key)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; };
  const cg   = (ck)      => { const vs=RUBROS.map(r=>cs(r.key,ck)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; };
  const gs   = useMemo(()=>{ const vs=RUBROS.map(r=>rs(r.key)).filter(v=>v>0); return vs.length ? vs.reduce((a,b)=>a+b)/vs.length : 0; }, [ans]);

  const totA = RUBROS.reduce((s,r)=>s+CRITERIOS.reduce((s2,c)=>s2+c.subs.filter(sq=>ans[r.key][sq.id]>0).length,0),0);
  const totQ = RUBROS.length * CRITERIOS.reduce((s,c)=>s+c.subs.length, 0);
  const pct  = Math.round((totA/totQ)*100);
  const ar   = RUBROS.find(r=>r.key===rubro);
  const arSc = rs(rubro);
  const rSc  = useMemo(()=>{ const o={}; CRITERIOS.forEach(c=>{o[c.key]=cs(rubro,c.key);}); return o; }, [ans,rubro]);

  const TABS = [{k:"intro",l:"Introducción"},{k:"detail",l:"Diagnóstico"},{k:"heatmap",l:"Heatmap"},{k:"resumen",l:"Resumen"},{k:"brechas",l:"Brechas & Roadmap"}];

  // font
  const FF = "'Segoe UI','Calibri',system-ui,sans-serif";

  // ── Modal de ID personalizado ─────────────────────────────────────────────
  if (showModal) return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
      display:"flex", alignItems:"center", justifyContent:"center",
      fontFamily:FF, zIndex:999,
    }}>
      <div style={{
        background:"white", borderRadius:14, padding:"36px 32px", width:420,
        boxShadow:"0 8px 48px rgba(0,0,0,0.18)",
        borderTop:`4px solid ${C.red}`,
      }}>
        {/* Logo */}
        <img src={LOGO_PNG} alt="Claro" style={{height:22, marginBottom:20}}/>

        <h2 style={{fontSize:18, fontWeight:800, color:C.ink, margin:"0 0 6px", letterSpacing:"-0.02em"}}>
          Nuevo diagnóstico
        </h2>
        <p style={{fontSize:13, color:C.inkMid, margin:"0 0 22px", lineHeight:1.55}}>
          Elige un nombre corto para identificar este diagnóstico.<br/>
          Este nombre aparecerá en el link para compartir.
        </p>

        {/* Input */}
        <div style={{marginBottom:6}}>
          <div style={{
            display:"flex", alignItems:"center",
            border:`1.5px solid ${idError ? "#FCA5A5" : C.border}`,
            borderRadius:8, overflow:"hidden", background:C.bg,
            transition:"border .15s",
          }}>
            <span style={{
              padding:"10px 12px", fontSize:12, color:C.inkSoft,
              background:C.bgStripe, borderRight:`1px solid ${C.border}`,
              flexShrink:0, userSelect:"none",
            }}>
              ?id=
            </span>
            <input
              autoFocus
              value={inputId}
              onChange={e => { setInputId(e.target.value); setIdError(""); }}
              onKeyDown={e => e.key === "Enter" && confirmId()}
              placeholder="claro-colombia, nicolas, q1-2025…"
              style={{
                flex:1, border:"none", outline:"none", padding:"10px 12px",
                fontSize:13, fontFamily:FF, background:"transparent", color:C.ink,
              }}
            />
          </div>
          {idError && <div style={{fontSize:11, color:"#DC2626", marginTop:5}}>{idError}</div>}
          {inputId && !idError && (
            <div style={{fontSize:11, color:C.inkSoft, marginTop:5}}>
              Link: <span style={{color:C.redH, fontWeight:600}}>
                {window.location.origin}/?id={inputId.trim().toLowerCase().replace(/\s+/g,"-").replace(/[^a-z0-9\-_]/g,"")}
              </span>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{display:"flex", gap:10, marginTop:22}}>
          <button
            onClick={confirmId}
            style={{
              flex:1, padding:"11px", borderRadius:8, border:"none",
              background:C.red, color:"white", fontSize:13, fontWeight:700,
              cursor:"pointer", fontFamily:FF,
            }}
          >
            Crear diagnóstico →
          </button>
          <button
            onClick={() => {
              const id = genId();
              setAssessId(id); setIdInUrl(id); setShowModal(false);
            }}
            style={{
              padding:"11px 14px", borderRadius:8, fontFamily:FF,
              border:`1px solid ${C.border}`, background:"white",
              color:C.inkMid, fontSize:12, cursor:"pointer",
            }}
          >
            Aleatorio
          </button>
        </div>
      </div>
    </div>
  );

  const exportExcel = () => {

    const rows = [];
    RUBROS.forEach(r => {
      CRITERIOS.forEach(c => {
        c.subs.forEach(sq => {
          rows.push({
            Rubro: r.label,
            Criterio: `${c.num} - ${c.label}`,
            Pregunta: sq.t,
            Respuesta: ans[r.key]?.[sq.id] || "",
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Respuestas");

    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(blob, `DVB_Diagnostico_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

const resetAll = () => {
  const ok = window.confirm("¿Seguro que quieres reiniciar todas las respuestas?");
  if (!ok) return;
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  const o = emptyAns();
  const d = {}; RUBROS.forEach(r => { d[r.key] = ""; });
  setAns(o);
  setDrivers(d);
  if (assessId) saveAssessment(assessId, { ans: o, drivers: d }).catch(()=>{});
  setTab("intro");
};

  return (
    <div style={{display:"flex", minHeight:"100vh", fontFamily:FF, background:C.bg, color:C.ink, opacity:mounted?1:0, transition:"opacity .25s"}}>

      {/* ═══════════════════════════════════ SIDEBAR ═══ */}
      <aside style={{
        width:248, flexShrink:0,
        background:C.white,
        borderRight:`1px solid ${C.border}`,
        display:"flex", flexDirection:"column",
        position:"sticky", top:0, height:"100vh", overflowY:"auto",
      }}>

        {/* BRAND — logo + project name */}
        <div style={{padding:"18px 18px 16px", borderBottom:`3px solid ${C.red}`, background:C.white}}>
          {/* Real Claro logo PNG — red on white, perfect as-is */}
          <img src={LOGO_PNG} alt="Claro" style={{height:24, width:"auto", display:"block", marginBottom:10}}/>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            <div style={{width:2, height:28, background:C.red, borderRadius:99, flexShrink:0}}/>
            <div>
              <div style={{fontSize:11, fontWeight:800, color:C.ink, lineHeight:1.25, letterSpacing:"-0.01em"}}>Drivers Value Budgeting</div>
              <div style={{fontSize:9.5, fontWeight:500, color:C.inkSoft, marginTop:1, letterSpacing:"0.01em"}}>Diagnóstico de Madurez CAPEX</div>
            </div>
          </div>
        </div>

        {/* PROGRESS */}
        <div style={{padding:"13px 18px", borderBottom:`1px solid ${C.borderSm}`}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:6}}>
            <span style={{fontSize:9.5, fontWeight:600, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.1em"}}>Progreso</span>
            <span style={{fontSize:14, fontWeight:800, color:pct===100?C.L[3].c:C.red}}>{pct}%</span>
          </div>
          <PBar v={pct*5/100} color={C.red} h={4}/>
          <div style={{marginTop:5, fontSize:9.5, color:C.inkSoft}}>{totA} / {totQ} preguntas</div>
        </div>

        {/* SCORE GLOBAL */}
        <div style={{padding:"13px 18px", borderBottom:`1px solid ${C.borderSm}`}}>
          <div style={{fontSize:9, fontWeight:600, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:4}}>Madurez Global</div>
          <div style={{display:"flex", alignItems:"baseline", gap:3}}>
            <span style={{fontSize:40, fontWeight:900, color:gs>0?C.red:C.borderSm, lineHeight:1, letterSpacing:"-0.04em"}}>{fmt(gs)}</span>
            <span style={{fontSize:13, color:C.inkFaint}}>/5.0</span>
          </div>
          {gs>0 && <div style={{marginTop:5}}><Badge v={Math.round(gs)} sm/></div>}
        </div>

        {/* TABS */}
        <div style={{padding:"10px 10px 4px"}}>
          {TABS.map(({k,l}) => (
            <button key={k} onClick={()=>setTab(k)} style={{
              width:"100%", padding:"8px 10px",
              border:"none", borderRadius:6,
              background: tab===k ? C.redLight : "transparent",
              borderLeft: tab===k ? `3px solid ${C.red}` : "3px solid transparent",
              color: tab===k ? C.redH : C.inkMid,
              fontSize:12, fontWeight: tab===k ? 700 : 500,
              cursor:"pointer", transition:"all .15s", fontFamily:FF,
              textAlign:"left", marginBottom:2, display:"block",
            }}>{l}</button>
          ))}
        </div>

        {/* RUBRO NAV */}
        {tab==="detail" && (
          <nav style={{flex:1, padding:"6px 10px", overflowY:"auto"}}>
            <div style={{fontSize:9, fontWeight:700, color:C.inkFaint, textTransform:"uppercase", letterSpacing:"0.14em", padding:"0 4px", marginBottom:5}}>Paquete CAPEX</div>
            {RUBROS.map(r => {
              const sc=rs(r.key), isA=r.key===rubro;
              const qa=CRITERIOS.reduce((s,c)=>s+c.subs.filter(sq=>ans[r.key][sq.id]>0).length,0);
              return (
                <div key={r.key} onClick={()=>setRubro(r.key)} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"7px 8px",
                  borderRadius:6, cursor:"pointer",
                  background: isA ? C.redLight : "transparent",
                  borderLeft: isA ? `3px solid ${C.red}` : "3px solid transparent",
                  marginBottom:1, transition:"all .15s",
                }}>
                  <span style={{fontSize:14, flexShrink:0}}>{r.icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:12, fontWeight:isA?700:500, color:isA?C.redH:C.inkMid, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{r.label}</div>
                    <div style={{fontSize:9, color:C.inkSoft}}>{qa}/{CRITERIOS.reduce((s,c)=>s+c.subs.length,0)}</div>
                  </div>
                  {sc>0 && <span style={{flexShrink:0, fontSize:11, fontWeight:700, color:lv(Math.round(sc)).text, background:lv(Math.round(sc)).bg, border:`1px solid ${lv(Math.round(sc)).border}`, padding:"1px 6px", borderRadius:4}}>{sc.toFixed(1)}</span>}
                </div>
              );
            })}
          </nav>
        )}
        {tab!=="detail" && <div style={{flex:1}}/>}

        <div style={{padding:"14px 18px 16px", borderTop:`1px solid ${C.borderSm}`}}>
          <div style={{fontSize:8.5, color:C.inkFaint, marginBottom:10, letterSpacing:"0.04em"}}>
            Desarrollado por
          </div>
          {/* Kearney wordmark — SVG vectorial fiel al logo oficial post-2020 */}
          <svg viewBox="0 0 200 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:100, height:"auto", display:"block", marginBottom:8}}>
            <text
              x="0" y="24"
              fontFamily="'Helvetica Neue','Arial',sans-serif"
              fontSize="26"
              fontWeight="500"
              letterSpacing="4"
              fill="#1A1A1A"
            >KEARNEY</text>
          </svg>
          <div style={{fontSize:8, color:C.inkFaint, letterSpacing:"0.04em", lineHeight:1.6}}>
            DVB · 6 criterios · 8 paquetes<br/>Madurez CAPEX 2026
          </div>
        </div>
      </aside>

      {/* ═══════════════════════════════════ MAIN ═══ */}
      <main style={{flex:1, display:"flex", flexDirection:"column", minWidth:0}}>

        {/* TOPBAR */}
        <header style={{
          height:52, background:C.white,
          borderBottom:`1px solid ${C.border}`,
          borderTop:`3px solid ${C.red}`,
          padding:"0 28px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          position:"sticky", top:0, zIndex:50,
        }}>
          <div style={{display:"flex", alignItems:"center", gap:10}}>
            {/* Logo: red on white – no filter */}
            <img src={LOGO_PNG} alt="Claro" style={{height:19, width:"auto", flexShrink:0}}/>
            <div style={{width:1, height:20, background:C.border, flexShrink:0}}/>
            <span style={{fontSize:12.5, fontWeight:700, color:C.redH, letterSpacing:"-0.01em"}}>Drivers Value Budgeting</span>
            <div style={{width:1, height:14, background:C.borderSm, flexShrink:0}}/>
            <span style={{fontSize:11, color:C.inkSoft, fontWeight:400}}>Diagnóstico de Madurez CAPEX</span>
            {tab==="detail" && <>
              <span style={{color:C.borderSm, fontSize:14, lineHeight:1}}>›</span>
              <span style={{fontSize:11.5, fontWeight:600, color:C.ink}}>{ar.icon} {ar.label}</span>
              {arSc>0 && <Badge v={Math.round(arSc)} sm/>}
            </>}
          </div>
          <div style={{display:"flex", gap:8, alignItems:"center"}}>

            {/* Save status */}
            <div style={{fontSize:11, color:
              saveStatus==="saving" ? C.inkSoft :
              saveStatus==="saved"  ? "#16A34A" :
              saveStatus==="error"  ? "#DC2626" : "transparent",
              display:"flex", alignItems:"center", gap:4, minWidth:90, transition:"color .3s",
            }}>
              {saveStatus==="saving" && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:"spin 1s linear infinite"}}><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>Guardando…</>}
              {saveStatus==="saved"  && <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>Guardado</>}
              {saveStatus==="error"  && "⚠ Error"}
            </div>

            <div style={{width:1, height:14, background:C.borderSm}}/>
            <span style={{fontSize:11, color:C.inkSoft}}>{totA}/{totQ} · {pct}%</span>
            <div style={{width:60, height:3, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
              <div style={{height:"100%", width:`${pct}%`, background:C.red, borderRadius:99}}/>
            </div>
            <div style={{width:1, height:14, background:C.borderSm}}/>

            {/* Contador de personas viendo */}
            <div style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 10px", borderRadius:7,
              background: viewers > 1 ? "#FEF9C3" : C.bgStripe,
              border:`1px solid ${viewers > 1 ? "#FDE047" : C.borderSm}`,
              fontSize:11, fontWeight:600,
              color: viewers > 1 ? "#854D0E" : C.inkSoft,
              transition:"all .3s",
            }}>
              {/* Dot parpadeante */}
              <div style={{
                width:6, height:6, borderRadius:"50%",
                background: viewers > 1 ? "#EAB308" : C.inkFaint,
                animation: viewers > 1 ? "pulse 1.5s infinite" : "none",
              }}/>
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
              {viewers} {viewers === 1 ? "viendo" : "viendo"}
            </div>

            {/* Compartir */}
            <button onClick={copyLink} style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"6px 11px", borderRadius:7,
              background: copied ? "#F0FDF4" : C.redLight,
              border:`1px solid ${copied ? "#BBF7D0" : C.redBorder}`,
              color: copied ? "#16A34A" : C.redH,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF, transition:"all .2s",
            }}>
              {copied
                ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>¡Copiado!</>
                : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>Compartir</>
              }
            </button>

            {/* Reiniciar */}
            <button onClick={resetAll} style={{
              padding:"6px 11px", background:"white", color:C.redH,
              border:`1px solid ${C.border}`, borderRadius:7,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
            }}>Reiniciar</button>

            {/* Descargar Excel */}
            <button onClick={exportExcel} style={{
              padding:"6px 11px", background:C.red, color:"white",
              border:"none", borderRadius:7,
              fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
            }}>⬇ Excel</button>

          </div>
        </header>

        {/* CONTENT */}
        <div style={{flex:1, overflowY:"auto", padding:"28px 32px"}}>

          {/* ══════════════════════════ INTRO ══ */}
          {tab==="intro" && (
            <div style={{maxWidth:900}}>

              {/* ── Hero ── */}
              <div style={{
                borderRadius:12, overflow:"hidden", marginBottom:20,
                boxShadow:"0 4px 28px rgba(0,0,0,0.12)",
                display:"grid", gridTemplateColumns:"260px 1fr",
              }}>
                {/* Panel rojo */}
                <div style={{background:`linear-gradient(160deg,#C8281C 0%,#A81E14 100%)`, padding:"28px 24px", display:"flex", flexDirection:"column", position:"relative", overflow:"hidden"}}>
                  <div style={{position:"absolute",top:-40,right:-40,width:120,height:120,borderRadius:"50%",background:"rgba(255,255,255,0.04)"}}/>
                  <div style={{position:"absolute",bottom:10,left:-25,width:80,height:80,borderRadius:"50%",background:"rgba(255,255,255,0.03)"}}/>
                  <img src={LOGO_PNG} alt="Claro" style={{height:24,width:"auto",marginBottom:20,filter:"brightness(0) saturate(100%) invert(1)",WebkitFilter:"brightness(0) saturate(100%) invert(1)"}}/>
                  <div style={{fontSize:9,fontWeight:700,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:10}}>Drivers Value Budgeting</div>
                  <h1 style={{fontSize:19,fontWeight:800,color:"white",margin:"0 0 4px",lineHeight:1.25,letterSpacing:"-0.01em"}}>Diagnóstico de Madurez</h1>
                  <h2 style={{fontSize:16,fontWeight:400,fontStyle:"italic",color:"rgba(255,255,255,0.7)",margin:"0 0 16px"}}>Construcción de CAPEX</h2>
                  <div style={{width:24,height:2,background:C.gold,borderRadius:99,marginBottom:14}}/>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",margin:0,lineHeight:1.6}}>8 Paquetes · 6 Criterios<br/>5 Niveles · 48 Preguntas</p>
                  <div style={{marginTop:"auto",paddingTop:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                    {RUBROS.map(r=>(
                      <div key={r.key} onClick={()=>{setRubro(r.key);setTab("detail");}} style={{background:"rgba(0,0,0,0.18)",borderRadius:5,padding:"5px 7px",fontSize:9.5,fontWeight:600,color:"rgba(255,255,255,0.8)",cursor:"pointer",border:"1px solid rgba(255,255,255,0.1)",textAlign:"center"}}>
                        {r.icon} {r.label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Panel blanco — objetivo */}
                <div style={{background:C.white, padding:"28px 30px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:14,background:C.red,borderRadius:99}}/>
                    <div style={{fontSize:9.5,fontWeight:700,color:C.inkSoft,textTransform:"uppercase",letterSpacing:"0.14em"}}>Objetivo del diagnóstico</div>
                  </div>
                  <p style={{fontSize:13,color:C.ink,lineHeight:1.7,margin:"0 0 16px"}}>
                    Este diagnóstico evalúa <strong>cómo se construye el presupuesto CAPEX</strong> en cada paquete tecnológico de Claro Colombia, identificando el nivel de madurez actual en 6 dimensiones clave del proceso de planeación de inversiones.
                  </p>
                  <p style={{fontSize:12.5,color:C.inkMid,lineHeight:1.65,margin:"0 0 18px"}}>
                    No evalúa qué se invierte ni cuánto — evalúa <em>cómo se decide, estima, documenta y controla</em> esa inversión. El resultado es un mapa claro de dónde está hoy el proceso y cuáles son las oportunidades de mayor impacto para mejorar la precisión, trazabilidad y gobernanza del CAPEX.
                  </p>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:10,paddingTop:14,borderTop:`1px solid ${C.borderSm}`}}>
                    {[["6","Criterios"],["5","Niveles"],["8","Paquetes"],["48","Preguntas"]].map(([n,l])=>(
                      <div key={l} style={{textAlign:"center"}}>
                        <div style={{fontSize:26,fontWeight:900,color:C.red,lineHeight:1}}>{n}</div>
                        <div style={{fontSize:9,color:C.inkSoft,letterSpacing:"0.08em",marginTop:3,textTransform:"uppercase"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── 6 Criterios ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h2 style={{fontSize:14,fontWeight:800,margin:0}}>¿Qué evalúa el diagnóstico?</h2>
                  <span style={{fontSize:11,color:C.inkSoft,fontStyle:"italic",marginLeft:4}}>6 criterios aplicados a cada paquete de CAPEX</span>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
                  {CRITERIOS.map(c=>(
                    <div key={c.key} style={{borderRadius:8,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                      <div style={{background:C.redH,padding:"7px 11px",display:"flex",alignItems:"center",gap:7}}>
                        <div style={{width:22,height:22,borderRadius:4,background:"rgba(255,255,255,0.18)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:10,fontWeight:900,color:"white"}}>{c.num}</span>
                        </div>
                        <span style={{fontSize:11.5,fontWeight:700,color:"white",flex:1}}>{c.label}</span>
                        <span style={{fontSize:14}}>{c.icon}</span>
                      </div>
                      <div style={{padding:"9px 11px 11px"}}>
                        <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.5}}>{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Escala ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h2 style={{fontSize:14,fontWeight:800,margin:0}}>Escala de calificación — 5 niveles</h2>
                </div>
                <div style={{display:"flex",gap:7}}>
                  {C.L.map((l,i)=>(
                    <div key={i} style={{flex:1,borderRadius:8,border:`1.5px solid ${l.border}`,overflow:"hidden"}}>
                      <div style={{background:l.c,padding:"7px 10px",display:"flex",alignItems:"center",gap:6}}>
                        <div style={{width:20,height:20,borderRadius:"50%",background:"rgba(255,255,255,0.22)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <span style={{fontSize:11,fontWeight:900,color:"white"}}>{i+1}</span>
                        </div>
                        <span style={{fontSize:9.5,fontWeight:800,color:"white",textTransform:"uppercase",letterSpacing:"0.07em"}}>{l.label}</span>
                      </div>
                      <div style={{padding:"8px 10px",background:l.bg}}>
                        <p style={{fontSize:10.5,color:l.text,margin:0,lineHeight:1.5}}>{
                          i===0?"No existe el proceso. Las decisiones son ad-hoc y no hay documentación ni responsables.":
                          i===1?"El proceso existe pero es informal, inconsistente o depende de personas clave sin respaldo institucional.":
                          i===2?"El proceso está documentado, es repetible y se aplica de forma consistente en la mayoría de los casos.":
                          i===3?"El proceso se mide con KPIs activos, tiene revisión periódica y genera acciones correctivas.":
                          "El proceso mejora continuamente, está institucionalizado y se usa como referencia interna."
                        }</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:12,padding:"10px 14px",background:C.bgStripe,borderRadius:7,border:`1px solid ${C.borderSm}`}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.ink}}>Criterio clave para calificar: </span>
                  <span style={{fontSize:11,color:C.inkMid}}>Califique el proceso <strong>tal como opera hoy</strong>, no como debería operar ni como está planificado. Si el proceso existe en papel pero no se aplica consistentemente, el nivel correcto es 1 o 2.</span>
                </div>
              </div>

              {/* ── Instructivo ── */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:18,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h2 style={{fontSize:14,fontWeight:800,margin:0}}>¿Cómo completar el diagnóstico?</h2>
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

                  {/* Modalidad 1: Individual */}
                  <div style={{borderRadius:10,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{background:C.redH,padding:"11px 16px",display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>🧑‍💻</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:"white"}}>Modalidad A — Cuestionario Individual</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.65)"}}>Tiempo estimado: 30–45 min por paquete</div>
                      </div>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {[
                        {n:"1", t:"Quién lo completa", d:"El responsable directo de construir el presupuesto de cada paquete tecnológico: el líder de planeación financiera o el responsable técnico del área. Una persona por paquete."},
                        {n:"2", t:"Cómo navegar", d:"Use el menú lateral para seleccionar el paquete que va a evaluar. Dentro de cada paquete, expanda los 6 criterios uno por uno y responda todas las preguntas antes de pasar al siguiente."},
                        {n:"3", t:"Cómo calificar", d:"Lea cada pregunta y seleccione el nivel (1–5) que mejor describe cómo opera ese proceso HOY. Si no existe el proceso, seleccione 1. Si existe pero es informal, seleccione 2. Sea honesto: el diagnóstico solo es útil si refleja la realidad."},
                        {n:"4", t:"Drivers por paquete", d:"En el criterio de Granularidad, hay un campo de texto libre para describir los drivers que usan actualmente para estimar el presupuesto de ese paquete (ej. cantidad de nodos, km de fibra, tickets). Complételo con el mayor detalle posible."},
                        {n:"5", t:"Guardar y compartir", d:"El diagnóstico se guarda automáticamente. Use 'Compartir' en la barra superior para enviar el link a otro participante o para retomarlo desde otro dispositivo."},
                      ].map((s,i,arr)=>(
                        <div key={i} style={{display:"flex",gap:10,paddingBottom:i<arr.length-1?12:0,marginBottom:i<arr.length-1?12:0,borderBottom:i<arr.length-1?`1px solid ${C.borderSm}`:"none"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:C.redLight,border:`1px solid ${C.redBorder}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <span style={{fontSize:10,fontWeight:900,color:C.redH}}>{s.n}</span>
                          </div>
                          <div>
                            <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginBottom:2}}>{s.t}</div>
                            <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.6}}>{s.d}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:"9px 12px",background:"#FFFBEB",borderRadius:7,border:"1px solid #FDE68A"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#92400E"}}>💡 Recomendación: </span>
                        <span style={{fontSize:11,color:"#92400E"}}>Complete primero el paquete que mejor conoce para calibrar la escala. Eso le dará un marco de referencia para evaluar los demás paquetes con consistencia.</span>
                      </div>
                    </div>
                  </div>

                  {/* Modalidad 2: Taller */}
                  <div style={{borderRadius:10,border:`1.5px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{background:"#1E3A5F",padding:"11px 16px",display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:20}}>👥</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:"white"}}>Modalidad B — Taller en Grupo</div>
                        <div style={{fontSize:10,color:"rgba(255,255,255,0.65)"}}>Tiempo estimado: 90–120 min por sesión</div>
                      </div>
                    </div>
                    <div style={{padding:"14px 16px"}}>
                      {[
                        {n:"1", t:"Quiénes participan", d:"Líder de planeación financiera + responsables de 2–3 paquetes por sesión + representante de controlling. Máximo 6 personas para mantener el foco. No es necesario tener a todos en la misma sesión."},
                        {n:"2", t:"Preparación previa", d:"El facilitador genera los links por paquete desde el Admin (botón 🔗 Generar link) y los comparte con los participantes antes de la sesión. Cada paquete tiene su propio link. Los participantes pueden revisar las preguntas antes del taller."},
                        {n:"3", t:"Dinámica del taller", d:"Proyecte el diagnóstico en pantalla. Lean cada pregunta en voz alta y debatan el nivel actual antes de seleccionar la calificación. Si hay desacuerdo entre participantes, documenten el rango y usen el promedio. El debate es parte del valor del ejercicio."},
                        {n:"4", t:"Foco de la discusión", d:"Para cada pregunta, la discusión debe responder: '¿Tenemos evidencia de que este proceso opera así hoy?' Si no hay evidencia (documento, reporte, acta), el nivel no puede ser 4 ni 5. La ausencia de evidencia es un hallazgo en sí mismo."},
                        {n:"5", t:"Al terminar el taller", d:"Use el Heatmap para revisar el resultado en conjunto. Identifiquen colectivamente las 2–3 brechas más críticas en el tab Brechas & Roadmap. Eso define el punto de partida para el plan de acción."},
                      ].map((s,i,arr)=>(
                        <div key={i} style={{display:"flex",gap:10,paddingBottom:i<arr.length-1?12:0,marginBottom:i<arr.length-1?12:0,borderBottom:i<arr.length-1?`1px solid ${C.borderSm}`:"none"}}>
                          <div style={{width:22,height:22,borderRadius:"50%",background:"#EFF6FF",border:"1px solid #BFDBFE",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                            <span style={{fontSize:10,fontWeight:900,color:"#1E3A5F"}}>{s.n}</span>
                          </div>
                          <div>
                            <div style={{fontSize:11.5,fontWeight:700,color:C.ink,marginBottom:2}}>{s.t}</div>
                            <p style={{fontSize:11,color:C.inkMid,margin:0,lineHeight:1.6}}>{s.d}</p>
                          </div>
                        </div>
                      ))}
                      <div style={{marginTop:12,padding:"9px 12px",background:"#EFF6FF",borderRadius:7,border:"1px solid #BFDBFE"}}>
                        <span style={{fontSize:11,fontWeight:700,color:"#1E3A5F"}}>💡 Recomendación: </span>
                        <span style={{fontSize:11,color:"#1E3A5F"}}>Haga una sesión por bloque de paquetes similares (ej. sesión 1: Red Móvil + Transmisión; sesión 2: Nube Pública + Nube Telco; sesión 3: IT + UMM + UMC). Esto mantiene el nivel de detalle sin fatiga.</span>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* CTA */}
              <div style={{display:"flex",justifyContent:"center",gap:10,paddingBottom:4}}>
                <button onClick={()=>setTab("detail")} style={{padding:"11px 30px",background:C.red,color:"white",border:"none",borderRadius:7,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:FF,letterSpacing:"0.02em"}}>
                  Comenzar Diagnóstico →
                </button>
                <button onClick={()=>setTab("heatmap")} style={{padding:"11px 22px",background:C.white,color:C.redH,border:`1.5px solid ${C.border}`,borderRadius:7,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:FF}}>
                  Ver Heatmap
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════ DIAGNÓSTICO ══ */}
          {tab==="detail" && (
            <div style={{maxWidth:920}}>

              {/* Rubro header */}
              <div style={{background:C.white, borderRadius:12, border:`1px solid ${C.border}`, padding:"20px 24px", marginBottom:18, boxShadow:"0 1px 8px rgba(0,0,0,0.05)", display:"flex", gap:24, alignItems:"center", flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:260}}>
                  <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:12}}>
                    <span style={{fontSize:28}}>{ar.icon}</span>
                    <div>
                      <h1 style={{fontSize:20, fontWeight:800, margin:0, letterSpacing:"-0.01em"}}>{ar.label}</h1>
                      <p style={{fontSize:11, color:C.inkSoft, margin:0}}>{ar.sub}</p>
                    </div>
                    {arSc>0 && <div style={{marginLeft:4}}><Badge v={Math.round(arSc)}/></div>}
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"7px 20px"}}>
                    {CRITERIOS.map(c => { const sc=cs(rubro,c.key); return (
                      <div key={c.key} style={{cursor:"pointer"}} onClick={()=>setExp(c.key)}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:3}}>
                          <span style={{fontSize:10, color:C.inkMid, fontWeight:600}}>{c.num} · {c.label.split(" ")[0]}</span>
                          <span style={{fontSize:10, fontWeight:700, color:sc>0?lv(Math.round(sc)).c:C.inkFaint}}>{fmt(sc)}</span>
                        </div>
                        <PBar v={sc} color={sc>0?lv(Math.round(sc)).c:C.borderSm}/>
                      </div>
                    ); })}
                  </div>
                </div>
                <div style={{flexShrink:0}}>
                  <Radar scores={rSc} size={196}/>
                </div>
              </div>

              {/* Criterio accordion */}
              {CRITERIOS.map(crit => {
                const csc = cs(rubro, crit.key);
                const isOpen = exp === crit.key;
                const aH = crit.subs.filter(sq=>ans[rubro][sq.id]>0).length;
                return (
                  <div key={crit.key} style={{
                    background:C.white, borderRadius:10, marginBottom:8,
                    border:`1px solid ${isOpen ? C.red+"66" : C.border}`,
                    overflow:"hidden", transition:"border-color .2s",
                    boxShadow: isOpen ? `0 2px 16px rgba(218,41,28,0.08)` : "none",
                  }}>
                    {/* Row header */}
                    <div onClick={()=>setExp(isOpen?null:crit.key)} style={{
                      padding:"12px 18px", cursor:"pointer",
                      display:"flex", alignItems:"center", gap:12,
                      background: isOpen ? C.redLight : C.white,
                      borderLeft: isOpen ? `4px solid ${C.red}` : "4px solid transparent",
                      transition:"all .15s", userSelect:"none",
                    }}>
                      <div style={{width:30, height:30, borderRadius:6, background:isOpen?C.red:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, transition:"all .15s"}}>
                        <span style={{fontSize:11, fontWeight:900, color:isOpen?"white":C.inkMid}}>{crit.num}</span>
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap"}}>
                          <span style={{fontSize:13.5, fontWeight:700}}>{crit.icon} {crit.label}</span>
                          {csc>0 && <Badge v={Math.round(csc)} sm/>}
                          <span style={{marginLeft:"auto", fontSize:10, color:C.inkSoft}}>{aH}/{crit.subs.length} resp.</span>
                        </div>
                        <div style={{display:"flex", alignItems:"center", gap:10}}>
                          <div style={{flex:1}}><PBar v={csc} color={csc>0?lv(Math.round(csc)).c:C.borderSm}/></div>
                          <span style={{fontSize:12, fontWeight:700, color:csc>0?lv(Math.round(csc)).c:C.inkFaint, width:22, textAlign:"right", flexShrink:0}}>{fmt(csc)}</span>
                        </div>
                      </div>
                      <span style={{color:C.inkSoft, fontSize:11, transform:isOpen?"rotate(180deg)":"none", transition:"transform .2s", flexShrink:0}}>▾</span>
                    </div>

                    {isOpen && (
                      <div style={{borderTop:`1px solid ${C.borderSm}`, padding:"18px 18px 22px"}}>

                        {/* Definition + vinculación */}
                        <div style={{display:"flex", gap:20, padding:"12px 14px", background:C.bgStripe, borderRadius:8, marginBottom:20, flexWrap:"wrap"}}>
                          <div style={{flex:1, minWidth:200}}>
                            <div style={{fontSize:9, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:4}}>Definición</div>
                            <p style={{fontSize:12, color:C.inkMid, margin:0, lineHeight:1.6}}>{crit.desc}</p>
                          </div>
                          <div style={{borderLeft:`1px solid ${C.border}`, paddingLeft:20, minWidth:160}}>
                            <div style={{fontSize:9, fontWeight:700, color:C.inkSoft, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:4}}>Vinculación DVB</div>
                            <p style={{fontSize:11, color:C.inkSoft, margin:0, lineHeight:1.6, fontStyle:"italic"}}>{crit.vinc}</p>
                          </div>
                        </div>

                        {/* ── ESCALA PRIMERO (like master vertical columns) ── */}
                        <ScaleCards critKey={crit.key} score={csc}/>

                        {/* ── PREGUNTAS DESPUÉS ── */}
                        <div style={{borderTop:`1px solid ${C.borderSm}`, paddingTop:18}}>
                          <div style={{fontSize:9.5, fontWeight:700, color:C.inkMid, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:14}}>
                            Preguntas de Diagnóstico
                          </div>
                          {crit.subs.map((sq,idx) => {
                            const val=ans[rubro][sq.id], l=val>0?lv(val):null;
                            return (
                              <div key={sq.id} style={{
                                marginBottom:12, padding:"12px 14px",
                                background: val>0 ? l.bg : C.bgStripe,
                                borderRadius:8,
                                border:`1px solid ${val>0 ? l.border : C.borderSm}`,
                                transition:"all .2s",
                              }}>
                                <div style={{display:"flex", gap:10, marginBottom:10, alignItems:"flex-start"}}>
                                  <div style={{width:20, height:20, borderRadius:"50%", background:val>0?l.c:C.borderSm, color:"white", fontSize:10, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, marginTop:1}}>{idx+1}</div>
                                  <p style={{fontSize:13, fontWeight:500, margin:0, lineHeight:1.6, flex:1, color:C.ink}}>{sq.t}</p>
                                  {val>0 && <Badge v={val} sm/>}
                                </div>
                                {/* 5 level buttons */}
                                <div style={{display:"flex", gap:6, marginLeft:30}}>
                                  {C.L.map((nv,i) => {
                                    const sel = val === i+1;
                                    return (
                                      <button key={i} onClick={()=>set(rubro,sq.id,i+1)} title={`${i+1} – ${nv.label}: ${crit.ndesc[i]}`} style={{
                                        flex:1, padding:"8px 4px",
                                        border:`1.5px solid ${sel ? nv.c : C.border}`,
                                        borderRadius:7,
                                        background: sel ? nv.bg : C.white,
                                        cursor:"pointer", transition:"all .15s",
                                        fontFamily:FF, textAlign:"center",
                                      }}>
                                        <div style={{fontSize:15, fontWeight:900, color:sel?nv.c:C.inkFaint, lineHeight:1}}>{i+1}</div>
                                        <div style={{fontSize:9, fontWeight:700, color:sel?nv.text:C.inkSoft, marginTop:2, lineHeight:1.2}}>{nv.label}</div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* ── PREGUNTA ABIERTA DE DRIVERS (solo Granularidad) ── */}
                        {crit.key === "granularidad" && (
                          <div style={{
                            marginTop:16, padding:"14px 16px",
                            background:C.bgStripe, borderRadius:8,
                            border:`1px solid ${C.border}`,
                          }}>
                            <div style={{fontSize:9.5, fontWeight:700, color:C.red, textTransform:"uppercase", letterSpacing:"0.14em", marginBottom:8}}>
                              🔍 Drivers utilizados en este paquete
                            </div>
                            <p style={{fontSize:12.5, color:C.inkMid, margin:"0 0 10px", lineHeight:1.55}}>
                              ¿Qué drivers o variables utilizan actualmente para estimar el presupuesto CAPEX de <strong>{ar.label}</strong>? (ej. cantidad de nodos, km de fibra, tickets proyectados, crecimiento de tráfico…)
                            </p>
                            <textarea
                              value={drivers[rubro] || ""}
                              onChange={e => setDriver(rubro, e.target.value)}
                              placeholder="Describe los drivers que usan hoy para construir el presupuesto de este paquete…"
                              rows={3}
                              style={{
                                width:"100%", boxSizing:"border-box",
                                padding:"10px 12px", borderRadius:7,
                                border:`1.5px solid ${drivers[rubro] ? C.red+"66" : C.border}`,
                                fontSize:12.5, fontFamily:FF, color:C.ink,
                                background:"white", resize:"vertical", outline:"none",
                                lineHeight:1.6, transition:"border .2s",
                              }}
                            />
                            {drivers[rubro] && (
                              <div style={{fontSize:10, color:"#16A34A", marginTop:4}}>✓ Guardado automáticamente</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══════════════════════════ HEATMAP ══ */}
          {tab==="heatmap" && (
            <div style={{maxWidth:1180}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:20, flexWrap:"wrap", gap:12}}>
                <div>
                  <h2 style={{fontSize:18, fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.02em"}}>Heatmap de Madurez CAPEX</h2>
                  <p style={{fontSize:12, color:C.inkMid, margin:0}}>6 Criterios × 8 Paquetes · Clic en una celda para ir al diagnóstico</p>
                </div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                  {C.L.map((l,i) => (
                    <div key={i} style={{display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:l.bg, border:`1px solid ${l.border}`, borderRadius:4, fontSize:10, fontWeight:700, color:l.text}}>
                      <span style={{width:6, height:6, borderRadius:"50%", background:l.c}}/>{i+1} {l.label}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{borderRadius:10, overflow:"hidden", boxShadow:"0 2px 16px rgba(0,0,0,0.07)", border:`1px solid ${C.border}`}}>
                <table style={{borderCollapse:"collapse", width:"100%", background:C.white, tableLayout:"fixed"}}>
                  <thead>
                    <tr style={{background:C.redH}}>
                      <th style={{padding:"11px 14px", color:"white", fontSize:11, fontWeight:700, textAlign:"left", width:140}}>Paquete</th>
                      {CRITERIOS.map(c => (
                        <th key={c.key} style={{padding:"9px 6px", color:"white", fontSize:9, fontWeight:600, textAlign:"center", width:90}}>
                          <div style={{fontSize:14, marginBottom:2}}>{c.icon}</div>
                          <div style={{fontWeight:800, fontSize:10}}>{c.num}</div>
                          <div style={{opacity:.7, fontWeight:400, lineHeight:1.3, fontSize:8.5}}>{c.label.split(" ")[0]}</div>
                        </th>
                      ))}
                      <th style={{padding:"9px 6px", color:"white", fontSize:10, fontWeight:700, textAlign:"center", width:80, background:"rgba(0,0,0,0.18)"}}>Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {RUBROS.map((r,i) => {
                      const sc=rs(r.key);
                      return (
                        <tr key={r.key} style={{background:i%2===0?C.white:C.bgStripe}}>
                          <td onClick={()=>{setRubro(r.key);setTab("detail");}} style={{padding:"10px 14px", fontSize:12, fontWeight:600, borderBottom:`1px solid ${C.borderSm}`, cursor:"pointer", whiteSpace:"nowrap"}}>
                            {r.icon} {r.label}
                          </td>
                          {CRITERIOS.map(c => {
                            const v=cs(r.key,c.key), l=v>0?lv(Math.round(v)):null;
                            return (
                              <td key={c.key} onClick={()=>{setRubro(r.key);setExp(c.key);setTab("detail");}} style={{
                                padding:"9px 6px", textAlign:"center",
                                borderBottom:`1px solid ${C.borderSm}`,
                                background: v>0 ? l.bg+"cc" : "transparent",
                                cursor:"pointer",
                              }}>
                                {v>0 ? <div>
                                  <div style={{fontSize:15, fontWeight:900, color:l.c, lineHeight:1}}>{v.toFixed(1)}</div>
                                  <div style={{fontSize:8.5, color:l.text, fontWeight:600, opacity:.85}}>{l.label}</div>
                                </div> : <span style={{color:C.borderSm, fontSize:16}}>—</span>}
                              </td>
                            );
                          })}
                          <td style={{padding:"9px 6px", textAlign:"center", borderBottom:`1px solid ${C.borderSm}`, background:C.bgStripe}}>
                            {sc>0 ? <div>
                              <div style={{fontSize:16, fontWeight:900, color:lv(Math.round(sc)).c}}>{sc.toFixed(1)}</div>
                              <div style={{fontSize:9, color:lv(Math.round(sc)).text, fontWeight:600}}>{lv(Math.round(sc)).label}</div>
                            </div> : <span style={{color:C.borderSm}}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{background:C.redLight}}>
                      <td style={{padding:"10px 14px", fontSize:11, fontWeight:700, color:C.redH}}>Promedio Criterio</td>
                      {CRITERIOS.map(c => { const v=cg(c.key), l=v>0?lv(Math.round(v)):null; return (
                        <td key={c.key} style={{padding:"9px 6px", textAlign:"center"}}>
                          {v>0 ? <span style={{fontSize:14, fontWeight:900, color:l.c}}>{v.toFixed(1)}</span> : <span style={{color:C.borderSm}}>—</span>}
                        </td>
                      ); })}
                      <td style={{padding:"9px 6px", textAlign:"center"}}>
                        <span style={{fontSize:16, fontWeight:900, color:C.red}}>{fmt(gs)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p style={{fontSize:11, color:C.inkSoft, marginTop:10}}>Clic en cualquier celda para ir al diagnóstico detallado de ese criterio.</p>
            </div>
          )}

          {/* ══════════════════════════ RESUMEN ══ */}
          {tab==="resumen" && (() => {
            // Scores filtrados por paquete o globales
            const rubroFilt = rFilter === "all" ? null : RUBROS.find(r=>r.key===rFilter);
            const csFilt  = (c) => rFilter==="all" ? cg(c) : cs(rFilter, c);
            const gsFilt  = rFilter==="all" ? gs : rs(rFilter);
            const totAFilt = rFilter==="all" ? totA : CRITERIOS.reduce((s,c)=>s+c.subs.filter(sq=>ans[rFilter]?.[sq.id]>0).length,0);
            const totQFilt = rFilter==="all" ? totQ : CRITERIOS.reduce((s,c)=>s+c.subs.length,0);
            const pctFilt  = totQFilt>0 ? Math.round((totAFilt/totQFilt)*100) : 0;

            return (
            <div style={{maxWidth:900}}>

              {/* Encabezado + filtro */}
              <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:20,flexWrap:"wrap",gap:12}}>
                <div>
                  <h2 style={{fontSize:18,fontWeight:800,margin:"0 0 3px",letterSpacing:"-0.02em"}}>Resumen Ejecutivo · Drivers Value Budgeting</h2>
                  <p style={{fontSize:12,color:C.inkMid,margin:0}}>
                    {rFilter==="all" ? "Vista consolidada — todos los paquetes" : `Paquete: ${rubroFilt?.icon} ${rubroFilt?.label}`}
                  </p>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <button onClick={()=>setRFilter("all")} style={{
                    padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:FF,
                    border:`1.5px solid ${rFilter==="all"?C.red:C.border}`,
                    background:rFilter==="all"?C.redLight:C.white,
                    color:rFilter==="all"?C.redH:C.inkMid,
                  }}>🏢 General</button>
                  {RUBROS.map(r=>(
                    <button key={r.key} onClick={()=>setRFilter(r.key)} style={{
                      padding:"5px 12px",borderRadius:7,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:FF,
                      border:`1.5px solid ${rFilter===r.key?C.red:C.border}`,
                      background:rFilter===r.key?C.redLight:C.white,
                      color:rFilter===r.key?C.redH:C.inkMid,
                    }}>{r.icon} {r.label}</button>
                  ))}
                </div>
              </div>

              {/* Score card */}
              <div style={{borderRadius:12,overflow:"hidden",marginBottom:20,boxShadow:"0 2px 20px rgba(0,0,0,0.09)",display:"grid",gridTemplateColumns:"200px 1fr"}}>
                <div style={{background:C.redH,padding:"28px 24px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                  <img src={LOGO_PNG} alt="Claro" style={{height:20,filter:"brightness(0) saturate(100%) invert(1)",WebkitFilter:"brightness(0) saturate(100%) invert(1)",marginBottom:14}}/>
                  <div style={{fontSize:8.5,color:"rgba(255,255,255,0.4)",textTransform:"uppercase",letterSpacing:"0.14em",textAlign:"center",marginBottom:6}}>
                    {rFilter==="all" ? "Madurez Global" : rubroFilt?.label}
                  </div>
                  <div style={{fontSize:52,fontWeight:900,color:gsFilt>0?"white":"rgba(255,255,255,0.15)",lineHeight:1,letterSpacing:"-0.04em"}}>{fmt(gsFilt)}</div>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.35)"}}>/5.0</div>
                  {gsFilt>0 && <div style={{marginTop:10,background:"rgba(255,255,255,0.15)",borderRadius:4,padding:"3px 10px",fontSize:11,fontWeight:700,color:"white"}}>{lv(Math.round(gsFilt)).label}</div>}
                </div>
                <div style={{background:C.white,padding:"24px 28px"}}>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
                    {[["Respondidas",totAFilt],["Total",totQFilt],["Completado",`${pctFilt}%`]].map(([l,v])=>(
                      <div key={l} style={{textAlign:"center",padding:"12px",background:C.bgStripe,borderRadius:8,border:`1px solid ${C.borderSm}`}}>
                        <div style={{fontSize:24,fontWeight:900,color:C.redH,lineHeight:1}}>{v}</div>
                        <div style={{fontSize:9.5,color:C.inkSoft,marginTop:4,textTransform:"uppercase",letterSpacing:"0.08em"}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{height:6,background:C.borderSm,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pctFilt}%`,background:`linear-gradient(90deg,${C.redH},${C.red})`,borderRadius:99}}/>
                  </div>
                  <div style={{marginTop:7,fontSize:11,color:C.inkSoft}}>{pctFilt}% del diagnóstico completado · {totAFilt}/{totQFilt} preguntas</div>
                </div>
              </div>

              {/* Por criterio */}
              <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                  <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                  <h3 style={{fontSize:14,fontWeight:700,margin:0}}>
                    Score por Criterio {rFilter==="all" ? "(promedio global)" : `— ${rubroFilt?.label}`}
                  </h3>
                </div>
                {CRITERIOS.map(c=>{const v=csFilt(c.key),l=v>0?lv(Math.round(v)):null;return(
                  <div key={c.key} style={{marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:10.5,fontWeight:800,color:C.redH,width:22,flexShrink:0}}>{c.num}</span>
                      <span style={{fontSize:12.5,fontWeight:600,flex:1}}>{c.icon} {c.label}</span>
                      {v>0?<Badge v={Math.round(v)} sm/>:<span style={{fontSize:10,color:C.inkSoft}}>Sin datos</span>}
                      <span style={{fontSize:13,fontWeight:700,color:v>0?l.c:C.inkFaint,width:24,textAlign:"right"}}>{fmt(v)}</span>
                    </div>
                    <div style={{paddingLeft:30}}><PBar v={v} color={v>0?l.c:C.borderSm}/></div>
                  </div>
                );})}
              </div>

              {/* Por paquete — solo si vista general */}
              {rFilter==="all" && (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Score por Paquete</h3>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                    {RUBROS.map(r=>{
                      const sc=rs(r.key),l=sc>0?lv(Math.round(sc)):null;
                      return(
                        <div key={r.key} onClick={()=>setRFilter(r.key)} style={{padding:"12px 14px",borderRadius:9,cursor:"pointer",background:sc>0?l.bg:C.bgStripe,border:`1px solid ${sc>0?l.border:C.borderSm}`,transition:"all .15s",position:"relative",overflow:"hidden"}}>
                          {sc>0&&<div style={{position:"absolute",top:0,left:0,right:0,height:3,background:l.c}}/>}
                          <div style={{fontSize:20,marginBottom:5,marginTop:sc>0?3:0}}>{r.icon}</div>
                          <div style={{fontSize:12,fontWeight:700,marginBottom:5}}>{r.label}</div>
                          <div style={{fontSize:24,fontWeight:900,color:sc>0?l.c:C.borderSm,lineHeight:1}}>{fmt(sc)}</div>
                          {sc>0&&<div style={{fontSize:10,color:l.text,fontWeight:600,marginTop:2,marginBottom:5}}>{l.label}</div>}
                          <div style={{marginTop:sc>0?0:8}}><PBar v={sc} color={sc>0?l.c:C.borderSm}/></div>
                          <div style={{marginTop:6,fontSize:9.5,color:C.inkSoft,textAlign:"center"}}>Ver detalle →</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Si filtrado por paquete: detalle de criterios de ese paquete */}
              {rFilter!=="all" && (
                <div style={{background:C.white,borderRadius:12,border:`1px solid ${C.border}`,padding:"20px 22px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
                    <div style={{width:3,height:15,background:C.red,borderRadius:99}}/>
                    <h3 style={{fontSize:14,fontWeight:700,margin:0}}>Detalle por pregunta — {rubroFilt?.label}</h3>
                  </div>
                  {CRITERIOS.map(c=>{
                    const sc=cs(rFilter,c.key),l=sc>0?lv(Math.round(sc)):null;
                    return(
                      <div key={c.key} style={{marginBottom:14,paddingBottom:14,borderBottom:`1px solid ${C.borderSm}`}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                          <div style={{width:24,height:24,borderRadius:5,background:sc>0?l.c:C.borderSm,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                            <span style={{fontSize:10,fontWeight:900,color:"white"}}>{c.num}</span>
                          </div>
                          <span style={{fontSize:13,fontWeight:700,flex:1}}>{c.icon} {c.label}</span>
                          {sc>0?<Badge v={Math.round(sc)} sm/>:<span style={{fontSize:10,color:C.inkSoft}}>Sin datos</span>}
                        </div>
                        {c.subs.map(sq=>{
                          const v=ans[rFilter]?.[sq.id]||0, sl=v>0?lv(v):null;
                          return(
                            <div key={sq.id} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.borderSm}`}}>
                              <p style={{fontSize:11,color:C.inkMid,flex:1,margin:0,lineHeight:1.45}}>{sq.t}</p>
                              {v>0
                                ? <div style={{display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
                                    <div style={{width:50,height:4,background:C.borderSm,borderRadius:99,overflow:"hidden"}}>
                                      <div style={{height:"100%",width:`${(v/5)*100}%`,background:sl.c,borderRadius:99}}/>
                                    </div>
                                    <span style={{fontSize:11,fontWeight:700,color:sl.c,width:16}}>{v}</span>
                                    <span style={{fontSize:10,color:sl.text,background:sl.bg,border:`1px solid ${sl.border}`,borderRadius:4,padding:"1px 5px"}}>{sl.label}</span>
                                  </div>
                                : <span style={{fontSize:10,color:C.inkFaint,flexShrink:0}}>—</span>
                              }
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
            );
          })()}

          {/* ══════════════════════════ BRECHAS & ROADMAP ══ */}
          {tab==="brechas" && (() => {
            const brechas = [];
            RUBROS.forEach(r => {
              CRITERIOS.forEach(c => {
                c.subs.forEach(sq => {
                  const v = ans[r.key]?.[sq.id] || 0;
                  if (v > 0) brechas.push({ rubro:r, crit:c, sq, score:v, gap:5-v, key:`${r.key}-${sq.id}` });
                });
              });
            });

            // Filtro por paquete
            const brechasFilt = bFilter === "all" ? brechas : brechas.filter(b => b.rubro.key === bFilter);

            const top10 = [...brechasFilt].sort((a,b) => b.gap-a.gap || a.score-b.score).slice(0,10);
            const sinData = brechas.length === 0;
            const FASES = [
              {label:"Quick Wins",  sub:"0–3 meses",  color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0", icon:"⚡", items: top10.filter(b=>b.score<=2)},
              {label:"Corto Plazo", sub:"3–6 meses",  color:"#D97706", bg:"#FFFBEB", border:"#FDE68A", icon:"📅", items: top10.filter(b=>b.score===3)},
              {label:"Largo Plazo", sub:"6–18 meses", color:"#2563EB", bg:"#EFF6FF", border:"#BFDBFE", icon:"🎯", items: top10.filter(b=>b.score>=4&&b.gap>0)},
            ];
            const any = FASES.some(f=>f.items.length>0);
            if (!any && top10.length) {
              FASES[0].items = top10.slice(0,3);
              FASES[1].items = top10.slice(3,6);
              FASES[2].items = top10.slice(6,10);
            }
            return (
              <div style={{maxWidth:1060}}>
                <div style={{marginBottom:20, display:"flex", alignItems:"flex-end", justifyContent:"space-between", flexWrap:"wrap", gap:12}}>
                  <div>
                    <h2 style={{fontSize:18, fontWeight:800, margin:"0 0 4px", letterSpacing:"-0.02em"}}>Brechas & Roadmap</h2>
                    <p style={{fontSize:12, color:C.inkMid, margin:0}}>
                      {bFilter==="all" ? `General · ${brechas.length} respuestas` : `${RUBROS.find(r=>r.key===bFilter)?.label} · ${brechasFilt.length} respuestas`}
                      {" · "}Top 10 brechas ordenadas por gap al nivel óptimo (5)
                    </p>
                  </div>
                  {/* Filtro */}
                  <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                    <button onClick={()=>setBFilter("all")} style={{
                      padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:FF,
                      border:`1.5px solid ${bFilter==="all" ? C.red : C.border}`,
                      background: bFilter==="all" ? C.redLight : C.white,
                      color: bFilter==="all" ? C.redH : C.inkMid,
                    }}>
                      🏢 General (Claro)
                    </button>
                    {RUBROS.map(r => (
                      <button key={r.key} onClick={()=>setBFilter(r.key)} style={{
                        padding:"5px 12px", borderRadius:7, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:FF,
                        border:`1.5px solid ${bFilter===r.key ? C.red : C.border}`,
                        background: bFilter===r.key ? C.redLight : C.white,
                        color: bFilter===r.key ? C.redH : C.inkMid,
                      }}>
                        {r.icon} {r.label}
                      </button>
                    ))}
                  </div>
                </div>
                {sinData ? (
                  <div style={{padding:48, textAlign:"center", color:C.inkSoft, background:C.white, borderRadius:12, border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:32, marginBottom:12}}>📋</div>
                    <div style={{fontSize:14, fontWeight:600}}>Completa el diagnóstico primero</div>
                    <div style={{fontSize:12, marginTop:4}}>Responde preguntas en el tab Diagnóstico para ver las brechas y roadmap.</div>
                  </div>
                ) : (
                  <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
                    {/* Top 10 */}
                    <div style={{background:C.white, borderRadius:12, border:`1px solid ${C.border}`, overflow:"hidden"}}>
                      <div style={{padding:"14px 18px", borderBottom:`1px solid ${C.border}`, background:C.redLight, display:"flex", alignItems:"center", gap:8}}>
                        <div style={{width:6, height:18, borderRadius:3, background:C.red}}/>
                        <div>
                          <div style={{fontSize:13, fontWeight:800, color:C.ink}}>Top 10 Brechas</div>
                          <div style={{fontSize:10, color:C.inkSoft}}>Mayor distancia al nivel óptimo</div>
                        </div>
                      </div>
                      <div style={{padding:"4px 16px 12px"}}>
                        {top10.map((b,i) => {
                          const l = lv(b.score);
                          return (
                            <div key={b.key} style={{padding:"10px 0", borderBottom:i<9?`1px solid ${C.borderSm}`:"none", display:"flex", gap:10, alignItems:"flex-start"}}>
                              <div style={{width:22, height:22, borderRadius:"50%", flexShrink:0, background:i<3?C.red:C.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:900, color:i<3?"white":C.inkMid, marginTop:1}}>{i+1}</div>
                              <div style={{flex:1, minWidth:0}}>
                                <div style={{fontSize:9.5, color:C.inkSoft, marginBottom:3}}>{b.rubro.icon} {b.rubro.label} · {b.crit.num} {b.crit.label}</div>
                                <p style={{fontSize:11.5, color:C.ink, margin:"0 0 6px", lineHeight:1.45}}>{b.sq.t}</p>
                                <div style={{display:"flex", alignItems:"center", gap:8}}>
                                  <div style={{flex:1, height:4, background:C.borderSm, borderRadius:99, overflow:"hidden"}}>
                                    <div style={{height:"100%", width:`${(b.score/5)*100}%`, background:l.c, borderRadius:99}}/>
                                  </div>
                                  <span style={{fontSize:10, fontWeight:700, color:l.c, flexShrink:0}}>{b.score}/5</span>
                                  <span style={{fontSize:10, color:"#DC2626", fontWeight:700, flexShrink:0}}>gap −{b.gap}</span>
                                </div>
                                {b.sq.opp && (
                                  <div style={{marginTop:6, padding:"7px 10px", background:"#F0FDF4", borderRadius:6, border:"1px solid #BBF7D0"}}>
                                    <span style={{fontSize:10, fontWeight:700, color:"#16A34A"}}>💡 Oportunidad: </span>
                                    <span style={{fontSize:11, color:"#166534", lineHeight:1.45}}>{b.sq.opp}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Roadmap */}
                    <div style={{display:"flex", flexDirection:"column", gap:14}}>
                      {FASES.map((f,fi) => (
                        <div key={fi} style={{background:C.white, borderRadius:12, border:`1px solid ${f.border}`, overflow:"hidden"}}>
                          <div style={{padding:"12px 16px", background:f.bg, borderBottom:`1px solid ${f.border}`, display:"flex", alignItems:"center", gap:10}}>
                            <span style={{fontSize:18}}>{f.icon}</span>
                            <div>
                              <div style={{fontSize:13, fontWeight:800, color:f.color}}>{f.label}</div>
                              <div style={{fontSize:10, color:f.color, opacity:0.8}}>{f.sub}</div>
                            </div>
                            <div style={{marginLeft:"auto", fontSize:11, fontWeight:700, color:f.color, background:"white", padding:"2px 8px", borderRadius:99, border:`1px solid ${f.border}`}}>
                              {f.items.length} acción{f.items.length!==1?"es":""}
                            </div>
                          </div>
                          <div style={{padding:"8px 14px"}}>
                            {f.items.length===0
                              ? <p style={{fontSize:11, color:C.inkSoft, margin:"6px 0", fontStyle:"italic"}}>Sin brechas en esta fase.</p>
                              : f.items.map((b,bi) => (
                                <div key={b.key} style={{display:"flex", gap:8, alignItems:"flex-start", padding:"8px 0", borderBottom:bi<f.items.length-1?`1px solid ${C.borderSm}`:"none"}}>
                                  <div style={{width:5, height:5, borderRadius:"50%", background:f.color, flexShrink:0, marginTop:6}}/>
                                  <div style={{flex:1}}>
                                    <div style={{fontSize:10, color:f.color, fontWeight:700, marginBottom:2}}>{b.rubro.icon} {b.rubro.label} · {b.crit.label}</div>
                                    <p style={{fontSize:11.5, color:C.ink, margin:"0 0 4px", lineHeight:1.4}}>{b.sq.t}</p>
                                    <div style={{fontSize:10, color:C.inkSoft, marginBottom: b.sq.opp ? 5 : 0}}>
                                      Nivel actual: <span style={{fontWeight:700, color:lv(b.score).c}}>{b.score} – {lv(b.score).label}</span>
                                      {" "}→ Meta: <span style={{fontWeight:700, color:f.color}}>5 – Optimizado</span>
                                    </div>
                                    {b.sq.opp && (
                                      <div style={{padding:"6px 9px", background:"white", borderRadius:5, border:`1px solid ${f.border}`}}>
                                        <span style={{fontSize:10, fontWeight:700, color:f.color}}>💡 </span>
                                        <span style={{fontSize:10.5, color:C.inkMid, lineHeight:1.4}}>{b.sq.opp}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        </div>
      </main>
    </div>
  );
}
